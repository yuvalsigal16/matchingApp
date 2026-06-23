using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    // דירוג חשיבות של גורם התאמה בודד (gender/interests/age/...) להעדפת טיול.
    // PriorityRank = 1 הוא הכי חשוב. משמש לשקלול אישי של האלגוריתם.
    public class TripPreferencePriority
    {
        public int TripPreferenceID { get; set; }
        public string Factor { get; set; }
        public int PriorityRank { get; set; }

        private readonly TripPreferencePrioritiesDAL dal = new TripPreferencePrioritiesDAL();

        // ADD — מוסיף שורת דירוג אחת.
        public int Add(int tripPreferenceID, string factor, int priorityRank)
        {
            return dal.Add(tripPreferenceID, factor, priorityRank);
        }

        // CLEAR — מנקה את כל הדירוגים של ההעדפה (לקראת שמירה מחדש).
        public int Clear(int tripPreferenceID)
        {
            return dal.Clear(tripPreferenceID);
        }

        // GET — מחזיר את הדירוגים לפי סדר חשיבות.
        public List<TripPreferencePriority> GetByTripPreferenceID(int tripPreferenceID)
        {
            return dal.GetByTripPreferenceID(tripPreferenceID);
        }
    }
}
