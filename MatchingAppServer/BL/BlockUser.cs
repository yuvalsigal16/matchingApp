using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class BlockUser
    {
        public int BlockID { get; set; }
        public int BlockedUserID { get; set; }
        public string FirstName { get; set; }
        public string LastName { get; set; }
        public string ProfileImage { get; set; }
        public DateTime BlockedAt { get; set; }

        BlockUserDAL dal = new BlockUserDAL();


        public void Block(int userId, int blockedUserId)
        {
            if (userId == blockedUserId)
                throw new Exception("Cannot block yourself");

            dal.BlockUser(userId, blockedUserId);
        }

        public void UnblockUser(int userId, int blockedUserId)
        {
            dal.UnblockUser(userId, blockedUserId);
        }

        public List<BlockUser> GetBlockedUsers(int userId)
        {
            return dal.GetBlockedUsers(userId);
        }
    }
}
