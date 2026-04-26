using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class Questionnaire
    {
        public int QuestionnaireID { get; set; }
        public int UserID { get; set; }
        public bool? IsSmoker { get; set; }
        public bool? KeepsKosher { get; set; }
        public bool? KeepsShabbat { get; set; }
        public int? SpontaneityLevel { get; set; }
        public int? LifestyleLevel { get; set; }
        public string? SocialNetworks { get; set; }

        private readonly QuestionnaireDAL dal = new QuestionnaireDAL();

        // ADD
        public int Add(Questionnaire q)
        {
            return dal.Add(q);
        }

        // UPDATE
        public int Update(Questionnaire q)
        {
            return dal.Update(q);
        }

        // GET
        public Questionnaire GetByUserID(int userId)
        {
            return dal.GetByUserID(userId);
        }
    }
}
