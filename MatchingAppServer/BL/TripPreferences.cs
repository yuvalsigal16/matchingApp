using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class TripPreferences
    {
        public int TripPreferenceID { get; set; }
        public int TripID { get; set; }
        public string? PreferredGender { get; set; }
        public int? PreferredAgeMin { get; set; }
        public int? PreferredAgeMax { get; set; }
        public bool? IsSmoker { get; set; }
        public bool? KeepsKosher { get; set; }
        public bool? KeepsShabbat { get; set; }
        public int? SpontaneityLevel { get; set; }
        public int? LifestyleLevel { get; set; }

        private readonly TripPreferencesDAL dal = new TripPreferencesDAL();

        // ADD
        public int AddTripPreferences(TripPreferences pref)
        {
            return dal.AddTripPreferences(pref);
        }

        // UPDATE
        public int UpdateTripPreferences(TripPreferences pref)
        {
            return dal.UpdateTripPreferences(pref);
        }

        // GET BY TRIP ID
        public TripPreferences GetByTripId(int tripId)
        {
            return dal.GetByTripId(tripId);
        }
    }
}
