using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class Interest
    {
        public int InterestID { get; set; }
        public string InterestName { get; set; }

        InterestDAL dal = new InterestDAL();

        public List<Interest> GetAll()
        {
            return dal.GetAll();
        }

        public int Add(Interest interest)
        {
            return dal.Add(interest);
        }
    }
}
