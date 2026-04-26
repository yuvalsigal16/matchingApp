using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class Trip
    {
        public int TripID { get; set; }
        public int CreatedByUserID { get; set; }
        public string Destination { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string Status { get; set; }
        public DateTime CreatedAt { get; set; }

        private readonly TripDAL tripDal = new TripDAL();

        public Trip GetTripById(int tripId)
        {
            return tripDal.GetTripById(tripId);
        }
        // ADD
        public int AddTrip(Trip trip) // שיניתי מ-bool ל-int (יותר נכון)
        {
            if (trip.StartDate < DateTime.Today)
                throw new Exception("Trip cannot start in past");

            return tripDal.AddTrip(trip);
        }

        // GET USER TRIPS
        public List<Trip> GetUserTrips(int userId) // שינוי מ-User ל-id
        {
            List<Trip> trips = tripDal.GetTripsByUserID(userId);
            return trips;
        }

        // UPDATE
        public int UpdateTrip(Trip trip)
        {
            return tripDal.UpdateTrip(trip);
        }

        // DELETE
        public int DeleteTrip(int id)
        {
            return tripDal.DeleteTrip(id);
        }
    }
}
