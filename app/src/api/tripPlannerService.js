import { db } from "../../firebase/firebase";

import {
doc,
setDoc,
updateDoc,
arrayUnion,
onSnapshot,
} from "firebase/firestore";

/*
האזנה בזמן אמת ליומן של הטיול
*/

export const subscribePlanner = (
tripId,
callback
) => {

return onSnapshot(

doc(
db,
"trip_planner",
String(tripId)
),

(snapshot) => {

if (
snapshot.exists()
) {

callback(
snapshot.data()?.events || []
);

} else {

callback([]);

}

}

);

};

/*
הוספת אירוע ליומן
*/

export const addPlannerEvent =
async (
tripId,
event
) => {

const ref =
doc(
db,
"trip_planner",
String(tripId)
);

await setDoc(
ref,
{
events:[]
},
{
merge:true
}
);

await updateDoc(
ref,
{
events:
arrayUnion(
event
)
}
);

};