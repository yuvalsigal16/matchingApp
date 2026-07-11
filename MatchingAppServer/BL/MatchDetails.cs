using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class MatchDetails
    {
        public int MatchID { get; set; }
        public string MatchStatus { get; set; }
        public bool JourneyStarted { get; set; }   // 1 = נלחץ "יצאנו לדרך"
        public DateTime CreatedAt { get; set; }

        public int TripID { get; set; }
        public string Destination { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime? EndDate { get; set; }   // NULL = כרטיס לכיוון אחד

        public int ChatID { get; set; }

        public int User1ID { get; set; }
        public string User1FirstName { get; set; }
        public string User1LastName { get; set; }
        public string User1Image { get; set; }

        public int User2ID { get; set; }
        public string User2FirstName { get; set; }
        public string User2LastName { get; set; }
        public string User2Image { get; set; }

        public string LastMessage { get; set; }
        public DateTime? LastMessageTime { get; set; }

        private readonly MatchDetailsDAL _dal = new ();

        public List<MatchDetails> GetUserMatches(int userId)
        {
            if (userId <= 0)
                throw new ArgumentException("Invalid user id");

            return _dal.GetMatchesWithDetailsByUserID(userId);
        }
    }
}
