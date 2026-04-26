using MatchingAppServer.DAL;
using MatchingAppServer.Models;

namespace MatchingAppServer.BL
{
    public class Community
    {
        public int CommunityID { get; set; }
        public string CommunityName { get; set; }
        public string Description { get; set; }
        public int CreatedByUserID { get; set; }
        public int MembersCount { get; set; }
        public DateTime CreatedAt { get; set; }

        private readonly CommunityDAL dal = new();

        // ADD
        public int Add(Community community)
        {
            return dal.Add(community);
        }

        // GET ALL
        public List<Community> GetAll()
        {
            return dal.GetAll();
        }

        // GET BY ID
        public Community GetByID(int id)
        {
            return dal.GetByID(id);
        }

        // UPDATE
        public int Update(Community community)
        {
            return dal.Update(community);
        }

        //DELETE
        public int DeleteCommunity(int id)
        {
            return dal.DeleteCommunity(id);
        }

        // GET COMMUNITY WITH MEMBERS
        public CommunityWithMembers GetCommunityWithMembers(int id)
        {
            return dal.GetCommunityWithMembers(id);
        }
    }
}
