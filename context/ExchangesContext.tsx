import React, {
  createContext,
  useReducer,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  Exchange,
  ExchangeStatus,
  Attachment,
  Notification,
  NotificationType,
} from "@/types";
import {
  collection,
  addDoc,
  doc,
  updateDoc,
  query,
  where,
  orderBy,
  Timestamp,
  getDoc,
  onSnapshot,
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/firebase";
import { increment } from "firebase/firestore";
import { useNotifications } from "@/context/NotificationsContext";
import { useAuth } from "@/context/AuthContext";

const debounce = <T extends (...args: any[]) => any>(
  func: T,
  wait: number
): ((...args: Parameters<T>) => void) => {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

interface ExchangesState {
  exchanges: Exchange[];
  isLoading: boolean;
  error: string | null;
  fetchExchanges: (userId?: string) => () => void;
  createExchange: (
    exchange: Omit<
      Exchange,
      "id" | "createdAt" | "updatedAt" | "completedAt"
    > & {
      attachments?: (Attachment & { file: File })[];
    }
  ) => Promise<string>;
  updateExchangeStatus: (id: string, status: ExchangeStatus) => Promise<void>;
  getExchangeById: (id: string) => Exchange | undefined;
  getUserExchanges: (userId: string) => Exchange[];
  getPendingExchanges: (userId: string) => Exchange[];
  getCompletedExchanges: (userId: string) => Exchange[];
}

interface ExchangesAction {
  type: string;
  payload?: any;
}

const initialState: ExchangesState = {
  exchanges: [],
  isLoading: false,
  error: null,
  fetchExchanges: () => () => {},
  createExchange: async () => "",
  updateExchangeStatus: async () => {},
  getExchangeById: () => undefined,
  getUserExchanges: () => [],
  getPendingExchanges: () => [],
  getCompletedExchanges: () => [],
};

const ExchangesContext = createContext<ExchangesState | undefined>(undefined);

const exchangesReducer = (
  state: ExchangesState,
  action: ExchangesAction
): ExchangesState => {
  switch (action.type) {
    case "SET_EXCHANGES":
      return {
        ...state,
        exchanges: Array.isArray(action.payload) ? action.payload : [],
      };
    case "SET_LOADING":
      return { ...state, isLoading: action.payload };
    case "SET_ERROR":
      return { ...state, error: action.payload };
    default:
      return state;
  }
};

export const ExchangesProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, dispatch] = useReducer(exchangesReducer, initialState);
  const { addNotification } = useNotifications();
  const { user } = useAuth();

  useEffect(() => {
    const loadPersistedState = async () => {
      try {
        const persistedState = await AsyncStorage.getItem("exchanges-storage");
        if (persistedState) {
          const parsed = JSON.parse(persistedState);
          const exchanges = Array.isArray(parsed.exchanges)
            ? parsed.exchanges
            : [];
          dispatch({ type: "SET_EXCHANGES", payload: exchanges });
          console.log(
            "ExchangesProvider: Loaded exchanges from AsyncStorage:",
            exchanges.length
          );
        }
      } catch (error) {
        console.error(
          "ExchangesProvider: Error loading persisted state:",
          error
        );
        dispatch({
          type: "SET_ERROR",
          payload: "Failed to load cached exchanges",
        });
      }
    };
    loadPersistedState();
  }, []);

  const saveToAsyncStorage = useCallback(
    debounce(async (exchanges: Exchange[]) => {
      try {
        if (!Array.isArray(exchanges)) {
          console.warn(
            "ExchangesProvider: Attempted to save invalid exchanges data"
          );
          return;
        }
        await AsyncStorage.setItem(
          "exchanges-storage",
          JSON.stringify({ exchanges })
        );
        console.log(
          "ExchangesProvider: Saved exchanges to AsyncStorage:",
          exchanges.length
        );
      } catch (error) {
        console.error(
          "ExchangesProvider: Error saving to AsyncStorage:",
          error
        );
      }
    }, 1000),
    []
  );

  const fetchExchanges = useCallback(
    (userId?: string) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      let unsubscribes: Array<() => void> = [];

      try {
        const exchangesRef = collection(db, "exchanges");

        if (userId) {
          const initiatorQuery = query(
            exchangesRef,
            where("initiatorId", "==", doc(db, "users", userId)),
            orderBy("createdAt", "desc")
          );
          console.log("ExchangesProvider: Initiator Query:", userId);
          const unsubscribeInitiator = onSnapshot(
            initiatorQuery,
            (snapshot) => {
              try {
                const exchanges = snapshot.docs.map((doc) => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    initiatorId: data.initiatorId?.id ?? "",
                    recipientId: data.recipientId?.id ?? "",
                    initiatorSkillId: data.initiatorSkillId?.id ?? "",
                    recipientSkillId: data.recipientSkillId?.id ?? "",
                    proposedDate:
                      data.proposedDate?.toDate().toISOString() ??
                      new Date().toISOString(),
                    proposedDuration: data.proposedDuration ?? 0,
                    proposedLocation: data.proposedLocation ?? "",
                    notes: data.notes ?? "",
                    status: data.status ?? "pending",
                    createdAt:
                      data.createdAt?.toDate().toISOString() ??
                      new Date().toISOString(),
                    updatedAt:
                      data.updatedAt?.toDate().toISOString() ??
                      new Date().toISOString(),
                    completedAt: data.completedAt
                      ? data.completedAt.toDate().toISOString()
                      : undefined,
                    attachments: Array.isArray(data.attachments)
                      ? data.attachments
                      : [],
                  } as Exchange;
                });

                const currentExchanges = Array.isArray(state.exchanges)
                  ? state.exchanges
                  : [];
                const hasChanged =
                  exchanges.some((newEx, i) => {
                    const oldEx = currentExchanges[i];
                    if (!oldEx) return true;
                    return (
                      newEx.id !== oldEx.id ||
                      newEx.status !== oldEx.status ||
                      newEx.proposedDate !== oldEx.proposedDate ||
                      newEx.notes !== oldEx.notes ||
                      JSON.stringify(newEx.attachments) !==
                        JSON.stringify(oldEx.attachments)
                    );
                  }) || exchanges.length !== currentExchanges.length;

                if (hasChanged) {
                  dispatch({
                    type: "SET_EXCHANGES",
                    payload: Array.from(
                      new Map(
                        [
                          ...currentExchanges.filter(
                            (e) => !exchanges.some((newE) => newE.id === e.id)
                          ),
                          ...exchanges,
                        ].map((e) => [e.id, e])
                      ).values()
                    ),
                  });
                  saveToAsyncStorage(exchanges);
                }
                dispatch({ type: "SET_LOADING", payload: false });
                console.log(
                  "ExchangesProvider: Fetched initiator exchanges:",
                  exchanges.length
                );
              } catch (error) {
                console.error(
                  "ExchangesProvider: Initiator Snapshot Error:",
                  error
                );
                dispatch({
                  type: "SET_ERROR",
                  payload: "Failed to process initiator exchanges",
                });
                dispatch({ type: "SET_LOADING", payload: false });
              }
            },
            (error) => {
              console.error(
                "ExchangesProvider: Initiator Query Error:",
                error.message
              );
              dispatch({
                type: "SET_ERROR",
                payload: error.message.includes("index")
                  ? "Database index missing. Please contact support."
                  : error.message || "Failed to fetch initiator exchanges",
              });
              dispatch({ type: "SET_LOADING", payload: false });
            }
          );

          const recipientQuery = query(
            exchangesRef,
            where("recipientId", "==", doc(db, "users", userId)),
            orderBy("createdAt", "desc")
          );
          console.log("ExchangesProvider: Recipient Query:", userId);
          const unsubscribeRecipient = onSnapshot(
            recipientQuery,
            (snapshot) => {
              try {
                const exchanges = snapshot.docs.map((doc) => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    initiatorId: data.initiatorId?.id ?? "",
                    recipientId: data.recipientId?.id ?? "",
                    initiatorSkillId: data.initiatorSkillId?.id ?? "",
                    recipientSkillId: data.recipientSkillId?.id ?? "",
                    proposedDate:
                      data.proposedDate?.toDate().toISOString() ??
                      new Date().toISOString(),
                    proposedDuration: data.proposedDuration ?? 0,
                    proposedLocation: data.proposedLocation ?? "",
                    notes: data.notes ?? "",
                    status: data.status ?? "pending",
                    createdAt:
                      data.createdAt?.toDate().toISOString() ??
                      new Date().toISOString(),
                    updatedAt:
                      data.updatedAt?.toDate().toISOString() ??
                      new Date().toISOString(),
                    completedAt: data.completedAt
                      ? data.completedAt.toDate().toISOString()
                      : undefined,
                    attachments: Array.isArray(data.attachments)
                      ? data.attachments
                      : [],
                  } as Exchange;
                });

                const currentExchanges = Array.isArray(state.exchanges)
                  ? state.exchanges
                  : [];
                const hasChanged =
                  exchanges.some((newEx, i) => {
                    const oldEx = currentExchanges[i];
                    if (!oldEx) return true;
                    return (
                      newEx.id !== oldEx.id ||
                      newEx.status !== oldEx.status ||
                      newEx.proposedDate !== oldEx.proposedDate ||
                      newEx.notes !== oldEx.notes ||
                      JSON.stringify(newEx.attachments) !==
                        JSON.stringify(oldEx.attachments)
                    );
                  }) || exchanges.length !== currentExchanges.length;

                if (hasChanged) {
                  dispatch({
                    type: "SET_EXCHANGES",
                    payload: Array.from(
                      new Map(
                        [
                          ...currentExchanges.filter(
                            (e) => !exchanges.some((newE) => newE.id === e.id)
                          ),
                          ...exchanges,
                        ].map((e) => [e.id, e])
                      ).values()
                    ),
                  });
                  saveToAsyncStorage(exchanges);
                }
                dispatch({ type: "SET_LOADING", payload: false });
                console.log(
                  "ExchangesProvider: Fetched recipient exchanges:",
                  exchanges.length
                );
              } catch (error) {
                console.error(
                  "ExchangesProvider: Recipient Snapshot Error:",
                  error
                );
                dispatch({
                  type: "SET_ERROR",
                  payload: "Failed to process recipient exchanges",
                });
                dispatch({ type: "SET_LOADING", payload: false });
              }
            },
            (error) => {
              console.error(
                "ExchangesProvider: Recipient Query Error:",
                error.message
              );
              dispatch({
                type: "SET_ERROR",
                payload: error.message.includes("index")
                  ? "Database index missing. Please contact support."
                  : error.message || "Failed to fetch recipient exchanges",
              });
              dispatch({ type: "SET_LOADING", payload: false });
            }
          );

          unsubscribes = [unsubscribeInitiator, unsubscribeRecipient];
        } else {
          const allExchangesQuery = query(
            exchangesRef,
            orderBy("createdAt", "desc")
          );
          console.log("ExchangesProvider: All Exchanges Query");
          const unsubscribeAll = onSnapshot(
            allExchangesQuery,
            (snapshot) => {
              try {
                const exchanges = snapshot.docs.map((doc) => {
                  const data = doc.data();
                  return {
                    id: doc.id,
                    initiatorId: data.initiatorId?.id ?? "",
                    recipientId: data.recipientId?.id ?? "",
                    initiatorSkillId: data.initiatorSkillId?.id ?? "",
                    recipientSkillId: data.recipientSkillId?.id ?? "",
                    proposedDate:
                      data.proposedDate?.toDate().toISOString() ??
                      new Date().toISOString(),
                    proposedDuration: data.proposedDuration ?? 0,
                    proposedLocation: data.proposedLocation ?? "",
                    notes: data.notes ?? "",
                    status: data.status ?? "pending",
                    createdAt:
                      data.createdAt?.toDate().toISOString() ??
                      new Date().toISOString(),
                    updatedAt:
                      data.updatedAt?.toDate().toISOString() ??
                      new Date().toISOString(),
                    completedAt: data.completedAt
                      ? data.completedAt.toDate().toISOString()
                      : undefined,
                    attachments: Array.isArray(data.attachments)
                      ? data.attachments
                      : [],
                  } as Exchange;
                });

                const currentExchanges = Array.isArray(state.exchanges)
                  ? state.exchanges
                  : [];
                const hasChanged =
                  exchanges.some((newEx, i) => {
                    const oldEx = currentExchanges[i];
                    if (!oldEx) return true;
                    return (
                      newEx.id !== oldEx.id ||
                      newEx.status !== oldEx.status ||
                      newEx.proposedDate !== oldEx.proposedDate ||
                      newEx.notes !== oldEx.notes ||
                      JSON.stringify(newEx.attachments) !==
                        JSON.stringify(oldEx.attachments)
                    );
                  }) || exchanges.length !== currentExchanges.length;

                if (hasChanged) {
                  dispatch({ type: "SET_EXCHANGES", payload: exchanges });
                  saveToAsyncStorage(exchanges);
                }
                dispatch({ type: "SET_LOADING", payload: false });
                console.log(
                  "ExchangesProvider: Fetched all exchanges:",
                  exchanges.length
                );
              } catch (error) {
                console.error(
                  "ExchangesProvider: All Exchanges Snapshot Error:",
                  error
                );
                dispatch({
                  type: "SET_ERROR",
                  payload: "Failed to process all exchanges",
                });
                dispatch({ type: "SET_LOADING", payload: false });
              }
            },
            (error) => {
              console.error(
                "ExchangesProvider: All Exchanges Query Error:",
                error.message
              );
              dispatch({
                type: "SET_ERROR",
                payload: error.message.includes("index")
                  ? "Database index missing. Please contact support."
                  : error.message || "Failed to fetch all exchanges",
              });
              dispatch({ type: "SET_LOADING", payload: false });
            }
          );

          unsubscribes = [unsubscribeAll];
        }

        return () => {
          unsubscribes.forEach((unsubscribe) => unsubscribe());
          console.log("ExchangesProvider: Unsubscribed from exchanges");
        };
      } catch (error: any) {
        console.error(
          "ExchangesProvider: Fetch Exchanges Error:",
          error.message
        );
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to fetch exchanges",
        });
        dispatch({ type: "SET_LOADING", payload: false });
        return () => {};
      }
    },
    [saveToAsyncStorage]
  );

  const createExchange = useCallback(
    async (
      exchange: Omit<
        Exchange,
        "id" | "createdAt" | "updatedAt" | "completedAt"
      > & {
        attachments?: (Attachment & { file: File })[];
      }
    ) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const now = Timestamp.now();
        let attachments: Attachment[] = [];

        if (exchange.attachments) {
          attachments = await Promise.all(
            (exchange.attachments as (Attachment & { file: File })[]).map(
              async (attachment) => {
                const storageRef = ref(
                  storage,
                  `exchanges/${exchange.initiatorId}/${attachment.id}_${attachment.name}`
                );
                await uploadBytes(storageRef, attachment.file);
                const url = await getDownloadURL(storageRef);
                return {
                  id: attachment.id,
                  url,
                  type: attachment.type,
                  name: attachment.name,
                  size: attachment.size,
                  uploadedAt: now.toDate().toISOString(),
                };
              }
            )
          );
        }

        const newExchange = {
          initiatorId: doc(db, "users", exchange.initiatorId),
          recipientId: doc(db, "users", exchange.recipientId),
          initiatorSkillId: doc(db, "skills", exchange.initiatorSkillId),
          recipientSkillId: doc(db, "skills", exchange.recipientSkillId),
          status: exchange.status || "pending",
          proposedDate: Timestamp.fromDate(new Date(exchange.proposedDate)),
          proposedDuration: exchange.proposedDuration,
          proposedLocation: exchange.proposedLocation,
          notes: exchange.notes,
          createdAt: now,
          updatedAt: now,
          attachments,
        };

        const exchangeRef = await addDoc(
          collection(db, "exchanges"),
          newExchange
        );
        const createdExchange: Exchange = {
          id: exchangeRef.id,
          initiatorId: exchange.initiatorId,
          recipientId: exchange.recipientId,
          initiatorSkillId: exchange.initiatorSkillId,
          recipientSkillId: exchange.recipientSkillId,
          status: exchange.status || "pending",
          proposedDate: exchange.proposedDate,
          proposedDuration: exchange.proposedDuration,
          proposedLocation: exchange.proposedLocation,
          notes: exchange.notes,
          createdAt: now.toDate().toISOString(),
          updatedAt: now.toDate().toISOString(),
          attachments,
        };

        await addNotification({
          userId: exchange.recipientId,
          type: "exchange_request" as NotificationType,
          title: "New Exchange Request",
          message: `${user?.displayName || "Someone"} proposed an exchange`,
          relatedId: exchangeRef.id,
          isRead: false,
        });
        console.log("ExchangesProvider: Notified recipient of new exchange");

        dispatch({
          type: "SET_EXCHANGES",
          payload: [
            ...(Array.isArray(state.exchanges) ? state.exchanges : []),
            createdExchange,
          ],
        });
        saveToAsyncStorage([
          ...(Array.isArray(state.exchanges) ? state.exchanges : []),
          createdExchange,
        ]);
        dispatch({ type: "SET_LOADING", payload: false });
        console.log("ExchangesProvider: Created exchange:", exchangeRef.id);
        return exchangeRef.id;
      } catch (error: any) {
        console.error(
          "ExchangesProvider: Create Exchange Error:",
          error.message
        );
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to create exchange",
        });
        dispatch({ type: "SET_LOADING", payload: false });
        throw error;
      }
    },
    [state.exchanges, saveToAsyncStorage, addNotification, user]
  );

  const updateExchangeStatus = useCallback(
    async (id: string, status: ExchangeStatus) => {
      dispatch({ type: "SET_LOADING", payload: true });
      dispatch({ type: "SET_ERROR", payload: null });

      try {
        const now = Timestamp.now();
        const exchangeRef = doc(db, "exchanges", id);
        const exchangeDoc = await getDoc(exchangeRef);
        if (!exchangeDoc.exists()) {
          throw new Error("Exchange not found");
        }
        const exchangeData = exchangeDoc.data();
        const updateData: any = {
          status,
          updatedAt: now,
        };
        if (status === "completed") {
          updateData.completedAt = now;
          const initiatorRef = doc(
            db,
            "users",
            exchangeData.initiatorId?.id ?? ""
          );
          const recipientRef = doc(
            db,
            "users",
            exchangeData.recipientId?.id ?? ""
          );
          await Promise.all([
            updateDoc(initiatorRef, { completedExchanges: increment(1) }),
            updateDoc(recipientRef, { completedExchanges: increment(1) }),
          ]);
        }

        await updateDoc(exchangeRef, updateData);

        let notification: Omit<Notification, "id" | "createdAt"> | undefined;
        if (status === "accepted" || status === "declined") {
          notification = {
            userId: exchangeData.initiatorId?.id,
            type: `exchange_${status}` as NotificationType,
            title: `Exchange ${
              status.charAt(0).toUpperCase() + status.slice(1)
            }`,
            message: `${
              user?.displayName || "Someone"
            } ${status} your exchange request`,
            relatedId: id,
            isRead: false,
          };
        } else if (status === "canceled" || status === "completed") {
          const targetUserId =
            user?.id === exchangeData.initiatorId?.id
              ? exchangeData.recipientId?.id
              : exchangeData.initiatorId?.id;
          notification = {
            userId: targetUserId,
            type: `exchange_${status}` as NotificationType,
            title: `Exchange ${
              status.charAt(0).toUpperCase() + status.slice(1)
            }`,
            message: `${user?.displayName || "Someone"} ${status} the exchange`,
            relatedId: id,
            isRead: false,
          };
        }

        if (notification) {
          await addNotification(notification);
          console.log(`ExchangesProvider: Notified user of exchange ${status}`);
        }

        const updatedExchanges = (
          Array.isArray(state.exchanges) ? state.exchanges : []
        ).map((exchange) =>
          exchange.id === id
            ? {
                ...exchange,
                status,
                updatedAt: now.toDate().toISOString(),
                completedAt:
                  status === "completed"
                    ? now.toDate().toISOString()
                    : exchange.completedAt,
              }
            : exchange
        );

        dispatch({ type: "SET_EXCHANGES", payload: updatedExchanges });
        saveToAsyncStorage(updatedExchanges);
        dispatch({ type: "SET_LOADING", payload: false });
        console.log("ExchangesProvider: Updated exchange status:", id, status);
      } catch (error: any) {
        console.error(
          "ExchangesProvider: Update Exchange Status Error:",
          error.message
        );
        dispatch({
          type: "SET_ERROR",
          payload: error.message || "Failed to update exchange status",
        });
        dispatch({ type: "SET_LOADING", payload: false });
        throw error;
      }
    },
    [state.exchanges, saveToAsyncStorage, addNotification, user]
  );

  const getExchangeById = useCallback(
    (id: string) => {
      return (Array.isArray(state.exchanges) ? state.exchanges : []).find(
        (exchange) => exchange.id === id
      );
    },
    [state.exchanges]
  );

  const getUserExchanges = useCallback(
    (userId: string) => {
      return (Array.isArray(state.exchanges) ? state.exchanges : []).filter(
        (exchange) =>
          exchange.initiatorId === userId || exchange.recipientId === userId
      );
    },
    [state.exchanges]
  );

  const getPendingExchanges = useCallback(
    (userId: string) => {
      return (Array.isArray(state.exchanges) ? state.exchanges : []).filter(
        (exchange) =>
          (exchange.initiatorId === userId ||
            exchange.recipientId === userId) &&
          (exchange.status === "pending" ||
            exchange.status === "accepted" ||
            exchange.status === "in_progress")
      );
    },
    [state.exchanges]
  );

  const getCompletedExchanges = useCallback(
    (userId: string) => {
      return (Array.isArray(state.exchanges) ? state.exchanges : []).filter(
        (exchange) =>
          (exchange.initiatorId === userId ||
            exchange.recipientId === userId) &&
          exchange.status === "completed"
      );
    },
    [state.exchanges]
  );

  const value = useMemo(
    () => ({
      exchanges: Array.isArray(state.exchanges) ? state.exchanges : [],
      isLoading: state.isLoading,
      error: state.error,
      fetchExchanges,
      createExchange,
      updateExchangeStatus,
      getExchangeById,
      getUserExchanges,
      getPendingExchanges,
      getCompletedExchanges,
    }),
    [
      state.exchanges,
      state.isLoading,
      state.error,
      fetchExchanges,
      createExchange,
      updateExchangeStatus,
      getExchangeById,
      getUserExchanges,
      getPendingExchanges,
      getCompletedExchanges,
    ]
  );

  return (
    <ExchangesContext.Provider value={value}>
      {children}
    </ExchangesContext.Provider>
  );
};

export const useExchanges = () => {
  const context = React.useContext(ExchangesContext);
  if (!context) {
    throw new Error("useExchanges must be used within an ExchangesProvider");
  }
  return context;
};
