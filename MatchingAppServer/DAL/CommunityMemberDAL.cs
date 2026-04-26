using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;
using System.Reflection.PortableExecutable;

namespace MatchingAppServer.DAL
{
    public class CommunityMemberDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD MEMBER
        public int AddMember(int communityID, int userID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityID", communityID },
                { "@UserID", userID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddCommunityMember", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
                return Convert.ToInt32(result);
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // REMOVE MEMBER
        public int RemoveMember(int communityID, int userID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityID", communityID },
                { "@UserID", userID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("RemoveCommunityMember", con, param);

            try
            {
                object result = cmd.ExecuteScalar();
                return Convert.ToInt32(result);
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // GET MEMBERS
        public List<object> GetMembers(int communityID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityID", communityID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetCommunityMembers", con, param);

            try
            {
                reader = cmd.ExecuteReader();
                List<object> list = new List<object>();

                while (reader.Read())
                {
                    list.Add(new
                    {
                        UserID = Convert.ToInt32(reader["UserID"]),
                        Email = reader["Email"].ToString(),
                        ProfileImage = reader["ProfileImage"]?.ToString(),
                        JoinedAt = Convert.ToDateTime(reader["JoinedAt"])
                    });
                }

                return list;
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }
    }
}
