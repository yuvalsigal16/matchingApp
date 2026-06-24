import {
useLocalSearchParams,
} from "expo-router";

import {
useEffect,
useState,
} from "react";

import {
View,
Text,
TextInput,
TouchableOpacity,
ScrollView,
StyleSheet,
} from "react-native";

import {
subscribePlanner,
addPlannerEvent,
} from "../src/api/tripPlannerService";

export default function TripPlanner() {

const { id } =
useLocalSearchParams();

const [
events,
setEvents
] =
useState([]);

const [
title,
setTitle
] =
useState("");

const [
time,
setTime
] =
useState("");

useEffect(() => {

const unsubscribe =
subscribePlanner(
id,
setEvents
);

return unsubscribe;

}, [id]);

const save =
async () => {

if (
!title ||
!time
)
return;

await addPlannerEvent(
id,
{
title,
time,
createdAt:
Date.now(),
}
);

setTitle("");
setTime("");

};

return (

<ScrollView
style={
styles.container
}
>

<Text
style={
styles.title
}
>

🗓️ יומן הטיול

</Text>

<TextInput
style={
styles.input
}
placeholder="מה מתכננים?"
value={title}
onChangeText={setTitle}
/>

<TextInput
style={
styles.input
}
placeholder="שעה"
value={time}
onChangeText={setTime}
/>

<TouchableOpacity
style={
styles.button
}
onPress={save}
>

<Text
style={
styles.buttonText
}
>

הוסף ליומן

</Text>

</TouchableOpacity>

{

events.map(
(
event,
i
)=>(

<View
key={i}
style={
styles.card
}
>

<Text>

🕒 {event.time}

</Text>

<Text>

{event.title}

</Text>

</View>

)

)

}

</ScrollView>

);

}

const styles =
StyleSheet.create({

container:{
flex:1,
padding:20,
},

title:{
fontSize:24,
fontWeight:"bold",
marginBottom:20,
textAlign:"right",
},

input:{
borderWidth:1,
padding:12,
marginBottom:10,
borderRadius:12,
},

button:{
backgroundColor:"#1A3C40",
padding:14,
borderRadius:12,
},

buttonText:{
color:"#fff",
textAlign:"center",
},

card:{
backgroundColor:"#fff",
padding:14,
marginTop:10,
borderRadius:12,
},

});