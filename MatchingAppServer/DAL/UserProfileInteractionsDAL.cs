using MatchingAppServer.BL;
using Microsoft.Data.SqlClient;


namespace MatchingAppServer.DAL
{
    public class UserProfileInteractionsDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD — רישום אינטראקציה (View / Like / ChatRequest).
        public int Add(int fromUserID, int toUserID, string interactionType)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@FromUserID", fromUserID },
                { "@ToUserID", toUserID },
                { "@InteractionType", interactionType }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddUserProfileInteraction", con, param);

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

        // GET — זוגות "מי התעניין במי" עם משקל מסוכם (אינטראקציות + בקשות).
        public List<UserProfileInteraction> GetEngagementPairs()
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            cmd = CreateCommandWithStoredProcedureGeneral(
                "GetEngagementPairs", con, new Dictionary<string, object>());

            try
            {
                reader = cmd.ExecuteReader();

                List<UserProfileInteraction> list = new List<UserProfileInteraction>();

                while (reader.Read())
                {
                    list.Add(new UserProfileInteraction
                    {
                        FromUserID = Convert.ToInt32(reader["FromUserID"]),
                        ToUserID = Convert.ToInt32(reader["ToUserID"]),
                        Weight = Convert.ToInt32(reader["Weight"])
                    });
                }

                return list;
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
