using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class MatchChat
    {
        public int ChatID { get; set; }
        public int MatchID { get; set; }
        public DateTime CreatedAt { get; set; }

        private readonly MatchChatDAL dal = new();

        public MatchChat GetByMatchID(int matchID)
        {
            return dal.GetByMatchID(matchID);
        }
    }
}
