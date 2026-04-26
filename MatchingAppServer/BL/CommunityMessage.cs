using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class CommunityMessage
    {
        public int CommunityMessageID { get; set; }
        public int CommunityChatID { get; set; }
        public int SenderUserID { get; set; }
        public string Content { get; set; }
        public DateTime SentAt { get; set; }

        private readonly CommunityMessageDAL dal = new();

        public int SendMessage(CommunityMessage msg)
        {
            return dal.SendMessage(msg);
        }

        public List<CommunityMessage> GetMessagesByChatID(int chatID)
        {
            return dal.GetMessagesByChatID(chatID);
        }
    }
}
