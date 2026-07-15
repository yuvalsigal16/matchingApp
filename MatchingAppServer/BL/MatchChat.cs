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

        // משתתפי הצ'אט (User1/User2 + MatchID) לפי ChatID — לגזירת נמען Push בשרת.
        public Match GetParticipantsByChatID(int chatID)
        {
            return dal.GetParticipantsByChatID(chatID);
        }
    }
}
