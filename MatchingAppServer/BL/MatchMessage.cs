using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class MatchMessage
    {
        public int MessageID { get; set; }
        public int ChatID { get; set; }
        public int SenderUserID { get; set; }
        public string Content { get; set; }
        public DateTime SentAt { get; set; }

        private readonly MatchChatDAL dal = new MatchChatDAL();

        public int Send(MatchMessage msg)
        {
            return dal.SendMessage(msg);
        }
        public List<MatchMessage> GetByChatID(int chatID)
        {
            return dal.GetMessagesByChatID(chatID);
        }
    }
}
