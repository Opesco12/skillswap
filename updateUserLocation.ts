import { doc, updateDoc } from "firebase/firestore";
import * as Location from "expo-location";
import axios from "axios";
import { db } from "@/firebase";

export async function updateUserLocation(
  userId: string,
  location: {
    city: string;
    country: string;
    coordinates?: { latitude: number; longitude: number };
  }
) {
  try {
    let coordinates = location.coordinates;

    // Option 1: Get coordinates from device location
    if (!coordinates) {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === "granted") {
        const locationData = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        coordinates = {
          latitude: locationData.coords.latitude,
          longitude: locationData.coords.longitude,
        };
      }
    }

    // Option 2: Fallback to geocoding if no device coordinates
    if (!coordinates && location.city && location.country) {
      const query = `${location.city}, ${location.country}`;
      const response = await axios.get(
        "https://nominatim.openstreetmap.org/search",
        {
          params: {
            q: query,
            format: "json",
            limit: 1,
          },
        }
      );

      if (response.data.length > 0) {
        const result = response.data[0];
        coordinates = {
          latitude: parseFloat(result.lat),
          longitude: parseFloat(result.lon),
        };
      } else {
        coordinates = { latitude: 0, longitude: 0 };
      }
    }

    // Default to 0,0 if no coordinates
    coordinates = coordinates || { latitude: 0, longitude: 0 };

    // Validate coordinates
    if (
      coordinates.latitude < -90 ||
      coordinates.latitude > 90 ||
      coordinates.longitude < -180 ||
      coordinates.longitude > 180
    ) {
      throw new Error("Invalid coordinates");
    }

    // Update Firestore
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      location: {
        city: location.city,
        country: location.country,
        coordinates,
      },
    });

    return { city: location.city, country: location.country, coordinates };
  } catch (error) {
    console.error("Error updating user location:", error);
    throw error;
  }
}
