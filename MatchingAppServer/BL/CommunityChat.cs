using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class CommunityChat
    {
        public int CommunityChatID { get; set; }
        public int CommunityID { get; set; }
        public DateTime CreatedAt { get; set; }

        private readonly CommunityChatDAL dal = new();

        public CommunityChat GetByCommunityID(int communityID)
        {
            return dal.GetChatByCommunityID(communityID);
        }

        public CommunityChat GetByChatID(int chatID)
        {
            return dal.GetChatByChatID(chatID);
        }
    }
}
