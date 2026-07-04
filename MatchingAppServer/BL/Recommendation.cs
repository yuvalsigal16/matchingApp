using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class Recommendation
    {
        public int RecommendationID { get; set; }
        public int UserID { get; set; }
        public int? TripID { get; set; } // אופציונלי: המלצה כללית יכולה להיות בלי טיול
        public string PlaceName { get; set; }
        public string? Description { get; set; }
        public byte? Rating { get; set; }
        public string? MediaUrl { get; set; }
        public string? Category { get; set; }
        public bool IsAnonymous { get; set; }
        public string? TripName { get; set; } // שם היעד (מ-JOIN) — לפידים הגלובלי/לפי-יעד

        private readonly RecommendationDAL dal = new();

        public int AddRecommendation(Recommendation rec)
        {
            return dal.AddRecommendation(rec);
        }

        public int UpdateRecommendation(Recommendation rec)
        {
            return dal.UpdateRecommendation(rec);
        }

        public int DeleteRecommendation(int recommendationID)
        {
            return dal.DeleteRecommendation(recommendationID);
        }

        public List<Recommendation> GetByTripID(int tripID)
        {
            return dal.GetByTripID(tripID);
        }

        // כל ההמלצות מכל המשתמשים (פיד גלובלי)
        public List<Recommendation> GetAll()
        {
            return dal.GetAll();
        }

        // כל ההמלצות של יעד מסוים מכל המשתמשים (למשל "רומא")
        public List<Recommendation> GetByDestination(string destination)
        {
            return dal.GetByDestination(destination);
        }
    }
}
