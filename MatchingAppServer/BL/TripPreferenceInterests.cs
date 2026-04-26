using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class TripPreferenceInterests
    {
        public int TripPreferenceID { get; set; }
        public int InterestID { get; set; }

        private readonly TripPreferenceInterestsDAL dal = new TripPreferenceInterestsDAL();

        // ADD
        public int Add(int tripPreferenceID, int interestID)
        {
            return dal.Add(tripPreferenceID, interestID);
        }

        // DELETE
        public int Delete(int tripPreferenceID, int interestID)
        {
            return dal.Delete(tripPreferenceID, interestID);
        }

        // GET
        public List<Interest> GetByTripPreferenceID(int tripPreferenceID)
        {
            return dal.GetByTripPreferenceID(tripPreferenceID);
        }
    }
}
