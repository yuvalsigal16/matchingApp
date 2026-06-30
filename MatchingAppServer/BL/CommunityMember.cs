using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class CommunityMember
    {
        public int CommunityID { get; set; }
        public int UserID { get; set; }
        public string? FirstName { get; set; }
        public string? LastName { get; set; }
        public string? ProfileImage { get; set; }
        public DateTime JoinedAt { get; set; }

        private readonly CommunityMemberDAL dal = new();

        public int Add(int communityID, int userID)
        {
            return dal.AddMember(communityID, userID);
        }

        public int Remove(int communityID, int userID)
        {
            return dal.RemoveMember(communityID, userID);
        }

        public List<object> GetMembers(int communityID)
        {
            return dal.GetMembers(communityID);
        }

        public bool IsMember(int communityID, int userID)
        {
            return dal.IsMember(communityID, userID);
        }
    }
}
