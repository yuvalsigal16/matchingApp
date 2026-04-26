using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;
using MatchingAppServer.Models;

namespace MatchingAppServer.DAL
{
    public class CommunityDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // ADD
        public int Add(Community community)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityName", community.CommunityName },
                { "@Description", community.Description },
                { "@CreatedByUserID", community.CreatedByUserID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("AddCommunity", con, param);

            try
            {
                object result = cmd.ExecuteScalar(); // CommunityID
                return Convert.ToInt32(result);
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // GET ALL
        public List<Community> GetAll()
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            cmd = CreateCommandWithStoredProcedureGeneral("GetAllCommunities", con, null);

            try
            {
                reader = cmd.ExecuteReader();
                List<Community> list = new List<Community>();

                while (reader.Read())
                {
                    list.Add(new Community
                    {
                        CommunityID = Convert.ToInt32(reader["CommunityID"]),
                        CommunityName = reader["CommunityName"].ToString(),
                        Description = reader["Description"]?.ToString(),
                        CreatedByUserID = Convert.ToInt32(reader["CreatedByUserID"]),
                        MembersCount = Convert.ToInt32(reader["MembersCount"]),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"])
                    });
                }

                return list;
            }
            catch (Exception) { throw; }
            finally
            {
                if(con != null)
                    con.Close();
            }
        }

        // GET BY ID
        public Community GetByID(int id)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityID", id }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetCommunityByID", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                {
                    return new Community
                    {
                        CommunityID = Convert.ToInt32(reader["CommunityID"]),
                        CommunityName = reader["CommunityName"].ToString(),
                        Description = reader["Description"]?.ToString(),
                        CreatedByUserID = Convert.ToInt32(reader["CreatedByUserID"]),
                        CreatedAt = Convert.ToDateTime(reader["CreatedAt"])
                    };
                }

                return null;
            }
            catch (Exception) { throw; }
            finally
            {
                if(con != null)
                    con.Close();
            }
        }

        // UPDATE
        public int Update(Community community)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityID", community.CommunityID },
                { "@CommunityName", community.CommunityName },
                { "@Description", community.Description }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("UpdateCommunity", con, param);

            try
            {
                object result = cmd.ExecuteScalar(); // @@ROWCOUNT
                return Convert.ToInt32(result);
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        // DELETE COMMUNITY
        public int DeleteCommunity(int communityId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityID", communityId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("DeleteCommunity", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                if (reader.Read())
                    return Convert.ToInt32(reader["Success"]);

                return 0;
            }
            catch (Exception) { throw; }
            finally
            {
                if (con != null)
                    con.Close();
            }
        }

        public CommunityWithMembers GetCommunityWithMembers(int communityId)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@CommunityID", communityId }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetCommunityWithMembers", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                CommunityWithMembers community = null;

                while (reader.Read())
                {
                    if (community == null)
                    {
                        community = new CommunityWithMembers
                        {
                            CommunityID = Convert.ToInt32(reader["CommunityID"]),
                            CommunityName = reader["CommunityName"].ToString(),
                            Description = reader["Description"]?.ToString(),
                            CreatedByUserID = Convert.ToInt32(reader["CreatedByUserID"]),
                            CreatedAt = Convert.ToDateTime(reader["CreatedAt"]),
                            Members = new List<CommunityMember>()
                        };
                    }

                    // מוסיפים חבר לרשימה
                    if (reader["MemberUserID"] != DBNull.Value)
                    {
                        community.Members.Add(new CommunityMember
                        {
                            UserID = Convert.ToInt32(reader["MemberUserID"]),
                            FirstName = reader["FirstName"]?.ToString(),
                            LastName = reader["LastName"]?.ToString(),
                            ProfileImage = reader["ProfileImage"]?.ToString(),
                            JoinedAt = Convert.ToDateTime(reader["JoinedAt"])
                        });
                    }
                }

                return community;
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
