import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Exchange, ExchangeStatus, Attachment } from "@/types";
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
  ) => Promise<void>;
  updateExchangeStatus: (id: string, status: ExchangeStatus) => Promise<void>;
  getExchangeById: (id: string) => Exchange | undefined;
  getUserExchanges: (userId: string) => Exchange[];
  getPendingExchanges: (userId: string) => Exchange[];
  getCompletedExchanges: (userId: string) => Exchange[];
}

export const useExchangesStore = create<ExchangesState>()(
  persist(
    (set, get) => ({
      exchanges: [],
      isLoading: false,
      error: null,

      fetchExchanges: (userId?: string) => {
        set({ isLoading: true, error: null });

        let unsubscribes: Array<() => void> = [];

        try {
          const exchangesRef = collection(db, "exchanges");

          if (userId) {
            // Real-time listener for initiatorId
            const initiatorQuery = query(
              exchangesRef,
              where("initiatorId", "==", doc(db, "users", userId)),
              orderBy("createdAt", "desc")
            );
            const unsubscribeInitiator = onSnapshot(
              initiatorQuery,
              (snapshot) => {
                const exchanges = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  initiatorId: doc.data().initiatorId.id,
                  recipientId: doc.data().recipientId.id,
                  initiatorSkillId: doc.data().initiatorSkillId.id,
                  recipientSkillId: doc.data().recipientSkillId.id,
                  proposedDate: doc.data().proposedDate.toDate().toISOString(),
                  proposedDuration: doc.data().proposedDuration,
                  proposedLocation: doc.data().proposedLocation,
                  notes: doc.data().notes,
                  createdAt: doc.data().createdAt.toDate().toISOString(),
                  updatedAt: doc.data().updatedAt.toDate().toISOString(),
                  completedAt: doc.data().completedAt
                    ? doc.data().completedAt.toDate().toISOString()
                    : undefined,
                  attachments: doc.data().attachments || [],
                })) as Exchange[];

                // Merge with existing exchanges, removing duplicates
                set((state) => {
                  const allExchanges = [
                    ...state.exchanges.filter(
                      (e) => !exchanges.some((newE) => newE.id === e.id)
                    ),
                    ...exchanges,
                  ];
                  const uniqueExchanges = Array.from(
                    new Map(allExchanges.map((e) => [e.id, e])).values()
                  );
                  return { exchanges: uniqueExchanges, isLoading: false };
                });
              },
              (error) => {
                set({
                  error: error.message || "Failed to fetch exchanges",
                  isLoading: false,
                });
              }
            );

            // Real-time listener for recipientId
            const recipientQuery = query(
              exchangesRef,
              where("recipientId", "==", doc(db, "users", userId)),
              orderBy("createdAt", "desc")
            );
            const unsubscribeRecipient = onSnapshot(
              recipientQuery,
              (snapshot) => {
                const exchanges = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  initiatorId: doc.data().initiatorId.id,
                  recipientId: doc.data().recipientId.id,
                  initiatorSkillId: doc.data().initiatorSkillId.id,
                  recipientSkillId: doc.data().recipientSkillId.id,
                  proposedDate: doc.data().proposedDate.toDate().toISOString(),
                  proposedDuration: doc.data().proposedDuration,
                  proposedLocation: doc.data().proposedLocation,
                  notes: doc.data().notes,
                  createdAt: doc.data().createdAt.toDate().toISOString(),
                  updatedAt: doc.data().updatedAt.toDate().toISOString(),
                  completedAt: doc.data().completedAt
                    ? doc.data().completedAt.toDate().toISOString()
                    : undefined,
                  attachments: doc.data().attachments || [],
                })) as Exchange[];

                // Merge with existing exchanges, removing duplicates
                set((state) => {
                  const allExchanges = [
                    ...state.exchanges.filter(
                      (e) => !exchanges.some((newE) => newE.id === e.id)
                    ),
                    ...exchanges,
                  ];
                  const uniqueExchanges = Array.from(
                    new Map(allExchanges.map((e) => [e.id, e])).values()
                  );
                  return { exchanges: uniqueExchanges, isLoading: false };
                });
              },
              (error) => {
                set({
                  error: error.message || "Failed to fetch exchanges",
                  isLoading: false,
                });
              }
            );

            unsubscribes = [unsubscribeInitiator, unsubscribeRecipient];
          } else {
            // Real-time listener for all exchanges (admin use case)
            const allExchangesQuery = query(
              exchangesRef,
              orderBy("createdAt", "desc")
            );
            const unsubscribeAll = onSnapshot(
              allExchangesQuery,
              (snapshot) => {
                const exchanges = snapshot.docs.map((doc) => ({
                  id: doc.id,
                  ...doc.data(),
                  initiatorId: doc.data().initiatorId.id,
                  recipientId: doc.data().recipientId.id,
                  initiatorSkillId: doc.data().initiatorSkillId.id,
                  recipientSkillId: doc.data().recipientSkillId.id,
                  proposedDate: doc.data().proposedDate.toDate().toISOString(),
                  proposedDuration: doc.data().proposedDuration,
                  proposedLocation: doc.data().proposedLocation,
                  notes: doc.data().notes,
                  createdAt: doc.data().createdAt.toDate().toISOString(),
                  updatedAt: doc.data().updatedAt.toDate().toISOString(),
                  completedAt: doc.data().completedAt
                    ? doc.data().completedAt.toDate().toISOString()
                    : undefined,
                  attachments: doc.data().attachments || [],
                })) as Exchange[];

                set({ exchanges, isLoading: false });
              },
              (error) => {
                set({
                  error: error.message || "Failed to fetch exchanges",
                  isLoading: false,
                });
              }
            );

            unsubscribes = [unsubscribeAll];
          }

          // Return a function to unsubscribe all listeners
          return () => {
            unsubscribes.forEach((unsubscribe) => unsubscribe());
          };
        } catch (error: any) {
          set({
            error: error.message || "Failed to fetch exchanges",
            isLoading: false,
          });
          return () => {}; // Return empty unsubscribe function on error
        }
      },

      createExchange: async (exchange) => {
        set({ isLoading: true, error: null });
        try {
          const now = Timestamp.now();
          let attachments: Attachment[] = [];

          // Upload attachments to Firebase Storage
          if (exchange.attachments) {
            attachments = await Promise.all(
              exchange.attachments.map(async (attachment) => {
                const storageRef = ref(
                  storage,
                  `exchanges/temp/${attachment.id}_${attachment.name}`
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
              })
            );
          }

          const newExchange = {
            initiatorId: doc(db, "users", exchange.initiatorId),
            recipientId: doc(db, "users", exchange.recipientId),
            initiatorSkillId: doc(db, "skills", exchange.initiatorSkillId),
            recipientSkillId: doc(db, "skills", exchange.recipientSkillId),
            status: exchange.status || ExchangeStatus.Pending,
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
            status: exchange.status || ExchangeStatus.Pending,
            proposedDate: exchange.proposedDate,
            proposedDuration: exchange.proposedDuration,
            proposedLocation: exchange.proposedLocation,
            notes: exchange.notes,
            createdAt: now.toDate().toISOString(),
            updatedAt: now.toDate().toISOString(),
            attachments,
          };

          set((state) => ({
            exchanges: [...state.exchanges, createdExchange],
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            error: error.message || "Failed to create exchange",
            isLoading: false,
          });
          throw error;
        }
      },

      updateExchangeStatus: async (id, status) => {
        set({ isLoading: true, error: null });
        try {
          const now = Timestamp.now();
          const exchangeRef = doc(db, "exchanges", id);
          const updateData: any = {
            status,
            updatedAt: now,
          };
          if (status === ExchangeStatus.Completed) {
            updateData.completedAt = now;
            // Increment completedExchanges for both users
            const exchangeDoc = await getDoc(exchangeRef);
            const exchangeData = exchangeDoc.data();
            if (exchangeData) {
              const initiatorRef = doc(
                db,
                "users",
                exchangeData.initiatorId.id
              );
              const recipientRef = doc(
                db,
                "users",
                exchangeData.recipientId.id
              );
              await Promise.all([
                updateDoc(initiatorRef, { completedExchanges: increment(1) }),
                updateDoc(recipientRef, { completedExchanges: increment(1) }),
              ]);
            }
          }

          await updateDoc(exchangeRef, updateData);
          set((state) => ({
            exchanges: state.exchanges.map((exchange) =>
              exchange.id === id
                ? {
                    ...exchange,
                    status,
                    updatedAt: now.toDate().toISOString(),
                    completedAt:
                      status === ExchangeStatus.Completed
                        ? now.toDate().toISOString()
                        : exchange.completedAt,
                  }
                : exchange
            ),
            isLoading: false,
          }));
        } catch (error: any) {
          set({
            error: error.message || "Failed to update exchange status",
            isLoading: false,
          });
          throw error;
        }
      },

      getExchangeById: (id) => {
        return get().exchanges.find((exchange) => exchange.id === id);
      },

      getUserExchanges: (userId) => {
        return get().exchanges.filter(
          (exchange) =>
            exchange.initiatorId === userId || exchange.recipientId === userId
        );
      },

      getPendingExchanges: (userId) => {
        return get().exchanges.filter(
          (exchange) =>
            (exchange.initiatorId === userId ||
              exchange.recipientId === userId) &&
            (exchange.status === ExchangeStatus.Pending ||
              exchange.status === ExchangeStatus.Accepted ||
              exchange.status === ExchangeStatus.InProgress)
        );
      },

      getCompletedExchanges: (userId) => {
        return get().exchanges.filter(
          (exchange) =>
            (exchange.initiatorId === userId ||
              exchange.recipientId === userId) &&
            exchange.status === ExchangeStatus.Completed
        );
      },
    }),
    {
      name: "exchanges-storage",
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);
