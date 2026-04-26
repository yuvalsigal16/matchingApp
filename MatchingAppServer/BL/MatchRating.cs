using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class MatchRating
    {
        public int RatingID { get; set; }
        public int MatchID { get; set; }
        public int RaterUserID { get; set; }
        public int Score { get; set; }
        public string ReviewText { get; set; }
        public DateTime RatedAt { get; set; }

        private readonly MatchRatingDAL dal = new MatchRatingDAL();

        public int Add(MatchRating rating)
        {
            return dal.Add(rating);
        }

        public List<MatchRating> GetByMatchID(int matchID)
        {
            return dal.GetByMatchID(matchID);
        }
    }
}
