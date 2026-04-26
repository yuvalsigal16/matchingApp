using MatchingAppServer.BL;

namespace MatchingAppServer.Models
{
    public class CommunityWithMembers
    {
        public int CommunityID { get; set; }
        public string CommunityName { get; set; }
        public string Description { get; set; }
        public int CreatedByUserID { get; set; }
        public DateTime CreatedAt { get; set; }

        public List<CommunityMember> Members { get; set; } = new();
    }
}
