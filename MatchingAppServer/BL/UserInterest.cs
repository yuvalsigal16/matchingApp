using MatchingAppServer.DAL;
namespace MatchingAppServer.BL
{
    public class UserInterest
    {
        public int UserID { get; set; }
        public int InterestID { get; set; }

        UserInterestDAL dal = new UserInterestDAL();

        public int Add(int userId, int interestId)
        {
            return dal.Add(userId, interestId);
        }

        public int Delete(int userId, int interestId)
        {
            return dal.Delete(userId, interestId);
        }

        public List<Interest> GetByUserId(int userId)
        {
            return dal.GetByUserId(userId);
        }
    }
}
