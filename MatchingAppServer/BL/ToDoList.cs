using MatchingAppServer.DAL;

namespace MatchingAppServer.BL
{
    public class ToDoList
    {
        public int TaskID { get; set; }
        public int TripID { get; set; }
        public int UserID { get; set; }
        public string TaskText { get; set; }
        public bool IsDone { get; set; }

        private readonly ToDoListDAL dal = new();

        public int AddTask(ToDoList task)
        {
            return dal.AddTask(task);
        }

        public int MarkTaskDone(int taskID, bool isDone)
        {
            return dal.MarkTaskDone(taskID, isDone);
        }

        public int DeleteTask(int taskID)
        {
            return dal.DeleteTask(taskID);
        }

        public List<ToDoList> GetTasksByTripID(int tripID)
        {
            return dal.GetTasksByTripID(tripID);
        }

        public List<ToDoList> GetTasksByUserID(int userID)
        {
            return dal.GetTasksByUserID(userID);
        }
    }
}
