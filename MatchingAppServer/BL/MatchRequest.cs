using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class MatchRequest
    {
        public int RequestID { get; set; }
        public int FromUserID { get; set; }
        public int ToUserID { get; set; }
        public int TripID { get; set; }
        public string Status { get; set; }
        public DateTime RequestDate { get; set; }

        private readonly MatchRequestDAL dal = new();

        // SEND
        public int Send(int fromUserID, int toUserID, int tripID)
        {
            return dal.Send(fromUserID, toUserID, tripID);
        }

        // REJECT
        public int Reject(int requestID)
        {
            return dal.Reject(requestID);
        }

        // CANCEL
        public int Cancel(int requestID)
        {
            return dal.Cancel(requestID);
        }

        // GET PENDING
        public List<MatchRequest> GetPending(int userID)
        {
            return dal.GetPending(userID);
        }
    }
}
