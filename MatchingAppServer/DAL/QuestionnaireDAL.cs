using MatchingAppServer.BL;
using Microsoft.Data.SqlClient;

namespace MatchingAppServer.DAL
{
    public class QuestionnaireDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD
        public int Add(Questionnaire q)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", q.UserID },
                { "@IsSmoker", q.IsSmoker },
                { "@KeepsKosher", q.KeepsKosher },
                { "@KeepsShabbat", q.KeepsShabbat },
                { "@SpontaneityLevel", q.SpontaneityLevel},
                { "@LifestyleLevel", q.LifestyleLevel },
                { "@SocialNetworks", q.SocialNetworks ?? (object)DBNull.Value }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddQuestionnaire", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
                return Convert.ToInt32(result);
            }
            catch (Exception)
            {
                throw;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // UPDATE
        public int Update(Questionnaire q)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", q.UserID },
                { "@IsSmoker", q.IsSmoker },
                { "@KeepsKosher", q.KeepsKosher },
                { "@KeepsShabbat", q.KeepsShabbat },
                { "@SpontaneityLevel", q.SpontaneityLevel },
                { "@LifestyleLevel", q.LifestyleLevel },
                { "@SocialNetworks", q.SocialNetworks }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("UpdateQuestionnaire", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
                return Convert.ToInt32(result);
            }
            catch (Exception)
            {
                throw;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // GET
        public Questionnaire GetByUserID(int userId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@UserID", userId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetQuestionnaireByUserID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new Questionnaire
                    {
                        QuestionnaireID = Convert.ToInt32(reader["QuestionnaireID"]),
                        UserID = Convert.ToInt32(reader["UserID"]),
                        IsSmoker = reader["IsSmoker"] as bool?,
                        KeepsKosher = reader["KeepsKosher"] as bool?,
                        KeepsShabbat = reader["KeepsShabbat"] as bool?,
                        SpontaneityLevel = reader["SpontaneityLevel"] as int?,
                        LifestyleLevel = reader["LifestyleLevel"] as int?,
                        SocialNetworks =reader["SocialNetworks"].ToString()
                    };
                }

                return null;
            }
            catch (Exception)
            {
                throw;
            }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }
    }
}
