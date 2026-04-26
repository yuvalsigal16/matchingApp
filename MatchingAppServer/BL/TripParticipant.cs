using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class TripParticipant
    {
        public int TripID { get; set; }
        public int UserID { get; set; }

        private readonly TripParticipantDAL dal = new TripParticipantDAL();

        public int Add(int tripId, int userId)
        {
            return dal.Add(tripId, userId);
        }

        public int Remove(int tripId, int userId)
        {
            return dal.Remove(tripId, userId);
        }

        public List<User> GetUsersByTrip(int tripId)
        {
            return dal.GetTripParticipants(tripId);
        }
    }
}
