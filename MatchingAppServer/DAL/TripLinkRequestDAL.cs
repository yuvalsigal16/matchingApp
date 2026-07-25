using Microsoft.Data.SqlClient;
using MatchingAppServer.BL;

namespace MatchingAppServer.DAL
{
    // גישת נתונים לבקשות קישור-טיול. עוקב אחר הדפוס של MatchRequestDAL:
    // connect() + CreateCommandWithStoredProcedureGeneral + Dictionary פרמטרים + finally סוגר.
    // אין SQL ישיר — הכל דרך Stored Procedures.
    public class TripLinkRequestDAL : DBService
    {
        SqlConnection con;
        SqlCommand cmd;
        SqlDataReader reader;

        // CREATE — יוצר בקשה חדשה. מחזיר RequestID (SCOPE_IDENTITY מה-SP).
        public int Create(int matchID, int tripID, int requestedByUserID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@MatchID", matchID },
                { "@TripID", tripID },
                { "@RequestedByUserID", requestedByUserID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("CreateTripLinkRequest", con, param);

            try
            {
                object result = cmd.ExecuteScalar(); // RequestID
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

        // APPROVE — הצד השני מאשר. מחזיר MatchID, וב-out את TripID (לתשובת הקונטרולר).
        // ה-SP אטומי (UPDATE Matches + Status ביחד); כשל ולידציה/CAS עולה כ-SqlException.
        public int Approve(int requestID, int approverID, out int tripID)
        {
            tripID = 0;

            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@RequestID", requestID },
                { "@ApproverID", approverID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("ApproveTripLinkRequest", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                int matchID = 0;
                if (reader.Read())
                {
                    matchID = Convert.ToInt32(reader["MatchID"]);
                    tripID = Convert.ToInt32(reader["TripID"]);
                }

                return matchID;
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

        // REJECT — הצד השני דוחה. מחזיר MatchID (מה-SP). TripID לא מושפע.
        public int Reject(int requestID, int rejecterID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@RequestID", requestID },
                { "@RejecterID", rejecterID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("RejectTripLinkRequest", con, param);

            try
            {
                reader = cmd.ExecuteReader();

                int matchID = 0;
                if (reader.Read())
                    matchID = Convert.ToInt32(reader["MatchID"]);

                return matchID;
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

        // GET BY ID — בקשה בודדת (או null). לשימוש ה-pre-check בקונטרולר ולמזהה המבקש בהתראה.
        public TripLinkRequest GetById(int requestID)
        {
            try
            {
                con = connect();
            }
            catch (Exception) { throw; }

            var param = new Dictionary<string, object>()
            {
                { "@RequestID", requestID }
            };

            cmd = CreateCommandWithStoredProcedureGeneral("GetTripLinkRequestById", con, param);

            try
            {
                reader = cmd.ExecuteReader();
                return reader.Read() ? MapRow(reader) : null;
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

        // בונה TripLinkRequest משורת reader (משמש את GetById).
        private static TripLinkRequest MapRow(SqlDataReader r)
        {
            return new TripLinkRequest
            {
                RequestID = Convert.ToInt32(r["RequestID"]),
                MatchID = Convert.ToInt32(r["MatchID"]),
                TripID = Convert.ToInt32(r["TripID"]),
                RequestedByUserID = Convert.ToInt32(r["RequestedByUserID"]),
                Status = r["Status"].ToString(),
                CreatedAt = Convert.ToDateTime(r["CreatedAt"]),
                UpdatedAt = r["UpdatedAt"] == DBNull.Value ? (DateTime?)null : Convert.ToDateTime(r["UpdatedAt"])
            };
        }
    }
}
