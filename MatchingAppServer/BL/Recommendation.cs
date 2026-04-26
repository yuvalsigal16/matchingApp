using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class Recommendation
    {
        public int RecommendationID { get; set; }
        public int UserID { get; set; }
        public int TripID { get; set; }
        public string PlaceName { get; set; }
        public string? Description { get; set; }
        public byte? Rating { get; set; }
        public string? MediaUrl { get; set; }
        public bool IsAnonymous { get; set; }

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
    }
}
