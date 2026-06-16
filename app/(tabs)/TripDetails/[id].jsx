import { Ionicons } from "@expo/vector-icons";
import { useLocalSearchParams, useRouter } from "expo-router";
import { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { BASE_URL } from "../../src/api/config";
import { getToken } from "../../src/auth/authStore";

import { getMatchesByTrip } from "../../src/api/chatService";
import {
  getTripSuggestions,
} from "../../src/api/chatService";
import { getUserProfile } from "../../src/api/userProfileService";

import { StyleSheet } from "react-native";
export default function TripDetails() {
  const router = useRouter();
  const { id } = useLocalSearchParams();

  const [trip, setTrip] = useState(null);
  const [participants, setParticipants] = useState([]);
  const [creator, setCreator] = useState(null);
  const [matches, setMatches] = useState([]);
  const [chats, setChats] = useState([]);
  const [places, setPlaces] = useState([]);
const [rating, setRating] = useState(0);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const m = String(dateStr).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}/${m[2]}/${m[1]}`;
    const d = new Date(dateStr);
    return `${d.getDate().toString().padStart(2, "0")}/${(d.getMonth() + 1).toString().padStart(2, "0")}/${d.getFullYear()}`;
  };

  const isPast = trip?.endDate && new Date(trip.endDate) < new Date();

  /* =========================
     NAVIGATION
  ========================= */

  const openProfile = (userId) => {
    router.push({
      pathname: "/profile/UserProfile",
      params: { userId },
    });
  };

  const openChat = (matchId) => {
    router.push({
      pathname: "/chat/[matchId]",
      params: { matchId },
    });
  };

  /* =========================
     LOAD DATA
  ========================= */

  const showAlert = (title, msg) => {
    if (Platform.OS === "web") window.alert(`${title}\n${msg}`);
    else Alert.alert(title, msg);
  };

  useEffect(() => {
    const loadData = async () => {
      try {
        const token = getToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const tripRes = await fetch(`${BASE_URL}/Trip/${id}`, { headers });
        if (!tripRes.ok) throw new Error("Trip load failed");
        const tripData = await tripRes.json();
        setTrip(tripData);

        // המלצות לטיולים שיוצאים לדרך
if (
tripData.status?.toLowerCase() === "matched"
) {
try {

const interests =
tripData.interests
?.map(
(i)=>i.interestName
)
.join(",");

const suggestions =
await getTripSuggestions(
tripData.destination,
interests
);

setPlaces(
suggestions || []
);

}
catch(err){

console.log(
"Suggestions error",
err
);

}
}

        // 🔥 MATCHES מהשירות (לא fetch ישיר)
        const matchesData = await getMatchesByTrip(id);
        // טעינת פרטי יוצר הטיול
        const creatorId = tripData.createdByUserID ?? tripData.CreatedByUserID;
        if (creatorId) {
          try {
            const profile = await getUserProfile(creatorId);
            if (profile) setCreator(profile);
          } catch { /* לא נורא אם נכשל */ }
        }

        // משתתפים — כשלון לא קורס את המסך
        try {
          const participantsRes = await fetch(`${BASE_URL}/Trip/${id}/participants`, { headers });
          if (participantsRes.ok) setParticipants(await participantsRes.json() || []);
        } catch { /* אין משתתפים — לא נורא */ }

        // התאמות
        try {
          const matchesData = await getMatchesByTrip(id);
          setMatches(matchesData || []);
          setChats((matchesData || []).map((m) => ({
            matchID: m.matchID,
            name: m.name || `משתמש ${m.userId}`,
          })));
        } catch { /* אין התאמות — לא נורא */ }

      } catch (err) {
        console.log(err);
        showAlert("שגיאה", "טעינת הטיול נכשלה");
      } finally {
        setLoading(false);
      }
    };

    if (id) loadData();
  }, [id]);

  /* =========================
     DELETE TRIP
  ========================= */

  const confirmAndRun = (title, msg, action) => {
    if (Platform.OS === "web") {
      if (window.confirm(`${title}\n${msg}`)) action();
    } else {
      Alert.alert(title, msg, [
        { text: "ביטול", style: "cancel" },
        { text: "אישור", style: "destructive", onPress: action },
      ]);
    }
  };

  const handleDeleteTrip = () => {
    confirmAndRun("מחיקת טיול", "האם למחוק את הטיול לצמיתות?", async () => {
      try {
        setDeleting(true);
        const token = getToken();
        const res = await fetch(`${BASE_URL}/Trip/${id}`, {
          method: "DELETE",
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!res.ok) throw new Error("מחיקה נכשלה");
        router.back();
      } catch (err) {
        showAlert("שגיאה", err.message);
      } finally {
        setDeleting(false);
      }
    });
  };

  const handleDeactivate = () => {
    confirmAndRun("השבתת טיול", "הטיול יסומן כלא פעיל. ניתן להפעיל מחדש בעתיד.", async () => {
      try {
        setDeleting(true);
        const token = getToken();
        const res = await fetch(`${BASE_URL}/Trip/${id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ ...trip, status: "Inactive" }),
        });
        if (!res.ok) throw new Error("השבתה נכשלה");
        setTrip((prev) => ({ ...prev, status: "Inactive" }));
        showAlert("בוצע", "הטיול הושבת בהצלחה");
      } catch (err) {
        showAlert("שגיאה", err.message);
      } finally {
        setDeleting(false);
      }
    });
  };

  /* =========================
     LOADING
  ========================= */

  if (loading) {
    return (
      <SafeAreaView style={styles.center}>
        <ActivityIndicator size="large" color="#1A3C40" />
      </SafeAreaView>
    );
  }

  if (!trip) {
    return (
      <SafeAreaView style={styles.center}>
        <Text>לא נמצא טיול</Text>
      </SafeAreaView>
    );
  }

  /* =========================
     UI
  ========================= */

  return (
    <SafeAreaView style={styles.container}>
      {/* HEADER */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="arrow-forward" size={26} color="#1A3C40" />
        </TouchableOpacity>

        <Text style={styles.headerTitle}>פרטי טיול</Text>
        <View style={{ width: 26 }} />
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* TRIP CARD */}
        <View style={[styles.card, isPast && styles.cardPast]}>
          <Text style={styles.label}>יעד</Text>
          <Text style={styles.value}>{trip.destination ?? trip.Destination}</Text>

          <Text style={styles.label}>תאריכים</Text>
          <Text style={styles.value}>
            {formatDate(trip.startDate)} - {formatDate(trip.endDate)}
          </Text>

          <Text style={styles.label}>סטטוס</Text>
          <Text style={styles.value}>{trip.status}</Text>
        </View>

        {/* PARTICIPANTS */}
        <Text style={styles.sectionTitle}>משתתפים</Text>

        <View style={styles.card}>
          {/* יוצר הטיול תמיד ראשון */}
          {creator && (
            <View style={styles.participant}>
              <Ionicons name="person-circle" size={22} color="#1A3C40" />
              <View style={{ flex: 1, alignItems: "flex-end" }}>
                <Text style={[styles.value, { fontWeight: "bold" }]}>
                  {creator.firstName} {creator.lastName}
                </Text>
                <Text style={styles.label}>יוצר הטיול</Text>
              </View>
            </View>
          )}
          {participants
            .filter((p) => {
              const creatorId = trip?.createdByUserID ?? trip?.CreatedByUserID;
              return p.userID !== creatorId && p.userId !== creatorId;
            })
            .map((p, i) => (
              <View key={i} style={styles.participant}>
                <Ionicons name="person-circle-outline" size={22} color="#555" />
                <Text style={styles.value}>
                  {p.firstName} {p.lastName}
                </Text>
              </View>
            ))}
          {!creator && participants.length === 0 && (
            <Text style={styles.value}>אין משתתפים</Text>
          )}
        </View>

        {/* MATCHES */}
        <Text style={styles.sectionTitle}>התאמות עבורך</Text>

        {matches.length === 0 ? (
          <View style={styles.card}>
            <Text style={styles.value}>אין התאמות</Text>
          </View>
        ) : (
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {matches.map((m) => (
              <TouchableOpacity
                key={m.matchID}
                style={styles.matchCard}
                onPress={() => openProfile(m.userId)}
              >
                <View style={styles.avatar} />
                <Text style={styles.name}>{m.name || "משתמש"}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        )}

        {/* CHATS */}
        <Text style={styles.sectionTitle}>צ'אטים</Text>

        <View style={styles.card}>
          {chats.length === 0 ? (
            <Text style={styles.value}>אין צ'אטים עדיין</Text>
          ) : (
            chats.map((c) => (
              <TouchableOpacity
                key={c.matchID}
                style={styles.chatRow}
                onPress={() => openChat(c.matchID)}
              >
                <Ionicons name="chatbubble-outline" size={20} />
                <Text style={styles.value}>{c.name}</Text>
              </TouchableOpacity>
            ))
          )}
        </View>

{
trip.status
?.toLowerCase()
===
"matched"
&&
places.length
>
0
&&(

<>

<Text
style={
styles.sectionTitle
}
>

✨ המלצות בשבילכם

</Text>

<View
style={
styles.card
}
>

{

places.map(
(
p,
i
)=>(

<View
key={i}
style={{
marginBottom:16
}}
>

<Text
style={
styles.placeTitle
}
>

📍 {p.name}

</Text>

<Text>

⭐ {p.rating}

</Text>

<Text>

{p.address}

</Text>

</View>

)

)

}

</View>

</>

)
}

{
isPast
&&(

<>

<Text
style={
styles.sectionTitle
}
>

⭐ דרגו את ההתאמה

</Text>

<View
style={
styles.card
}
>

<View
style={{
flexDirection:
"row"
}}
>

{

[
1,
2,
3,
4,
5
]
.map(
(
star
)=>(

<TouchableOpacity
key={star}
onPress={()=>
setRating(
star
)
}
>

<Ionicons
name={
rating
>=
star
?
"star"
:
"star-outline"
}
size={
34
}
color={
"#F4B400"
}
/>

</TouchableOpacity>

)

)

}

</View>

</View>

</>

)
}


        {/* DELETE */}
        {/* ACTIONS */}
        <View style={styles.actions}>
          <TouchableOpacity
            style={styles.editBtn}
            onPress={() => router.push({
              pathname: "/PreferencesQuiz",
              params: { mode: "editTrip", tripId: id },
            })}
          >
            <Text style={styles.btnText}>ערוך טיול</Text>
          </TouchableOpacity>

          {trip.status !== "Inactive" && (
            <TouchableOpacity
              style={styles.deactivateBtn}
              onPress={handleDeactivate}
              disabled={deleting}
            >
              <Text style={styles.btnText}>
                {deleting ? "מעבד..." : "השבת טיול"}
              </Text>
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.deleteBtn}
            onPress={handleDeleteTrip}
            disabled={deleting}
          >
            <Text style={styles.btnText}>
              {deleting ? "מוחק..." : "מחק טיול"}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}



const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F0F2F5",
  },

  center: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  header: {
    flexDirection: "row-reverse",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 20,
  },

  headerTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1A3C40",
  },

  content: {
    padding: 20,
  },

  card: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 16,
    marginBottom: 15,
  },

  cardPast: {
    opacity: 0.7,
  },

  title: {
    fontSize: 22,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 10,
  },

  label: {
    fontSize: 12,
    color: "#777",
    textAlign: "right",
    marginTop: 8,
  },

  value: {
    fontSize: 15,
    textAlign: "right",
  },

  sectionTitle: {
    fontSize: 18,
    fontWeight: "bold",
    textAlign: "right",
    marginBottom: 10,
    marginTop: 15,
  },

  participant: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },

  matchCard: {
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    marginLeft: 10,
    alignItems: "center",
    width: 100,
  },

  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: "#ddd",
    marginBottom: 8,
  },

  name: {
    fontSize: 14,
  },

  chatRow: {
    flexDirection: "row-reverse",
    alignItems: "center",
    gap: 10,
    marginBottom: 10,
  },

  actions: {
    marginTop: 20,
    gap: 10,
  },

  editBtn: {
    backgroundColor: "#1A3C40",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  deactivateBtn: {
    backgroundColor: "#6B7280",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  deleteBtn: {
    backgroundColor: "#D9534F",
    padding: 14,
    borderRadius: 12,
    alignItems: "center",
  },

  btnText: {
    color: "#fff",
    fontWeight: "bold",
  },

  placeTitle:{
fontSize:16,
fontWeight:"bold",
marginBottom:4,
textAlign:"right",
},
});