// main.mo — Task Management Backend
// Language: Motoko (for Caffeine.ai / Internet Computer)
// Orthogonal persistence — no database needed, data lives in stable vars
// ──────────────────────────────────────────────────────────────────────

import HashMap "mo:base/HashMap";
import Nat "mo:base/Nat";
import Text "mo:base/Text";
import Int "mo:base/Int";
import Time "mo:base/Time";
import Iter "mo:base/Iter";
import Array "mo:base/Array";
import Option "mo:base/Option";
import Result "mo:base/Result";
import Hash "mo:base/Hash";

actor TaskManager {

  // ─── Types ──────────────────────────────────────────────────────────────────

  public type TaskStatus = {
    #Todo;
    #InProgress;
    #InReview;
    #Done;
  };

  public type TaskPriority = {
    #Urgent;
    #High;
    #Normal;
    #Low;
  };

  public type Subtask = {
    id: Nat;
    title: Text;
    completed: Bool;
  };

  public type Task = {
    id: Nat;
    title: Text;
    description: Text;
    status: TaskStatus;
    priority: TaskPriority;
    assignees: [Text];
    dueDate: ?Text;          // ISO date string e.g. "2025-12-31"
    estimatedHours: ?Float;
    tags: [Text];
    subtasks: [Subtask];
    attachments: [Text];     // file URLs or blob IDs
    createdAt: Int;          // nanoseconds (Time.now())
    updatedAt: Int;
    createdBy: Text;         // Internet Identity principal as Text
  };

  // Input type — no id or timestamps (backend generates those)
  public type TaskInput = {
    title: Text;
    description: Text;
    status: TaskStatus;
    priority: TaskPriority;
    assignees: [Text];
    dueDate: ?Text;
    estimatedHours: ?Float;
    tags: [Text];
    subtasks: [Subtask];
    attachments: [Text];
  };

  public type TaskError = {
    #NotFound;
    #InvalidInput: Text;
    #Unauthorized;
  };

  // ─── Stable Storage (survives canister upgrades) ─────────────────────────────

  stable var nextId: Nat = 1;
  stable var taskEntries: [(Nat, Task)] = [];

  // In-memory HashMap rebuilt from stable entries on upgrade
  var tasks: HashMap.HashMap<Nat, Task> = HashMap.fromIter(
    taskEntries.vals(),
    16,
    Nat.equal,
    Hash.hash
  );

  // Preserve data across upgrades
  system func preupgrade() {
    taskEntries := Iter.toArray(tasks.entries());
  };

  system func postupgrade() {
    tasks := HashMap.fromIter(
      taskEntries.vals(),
      16,
      Nat.equal,
      Hash.hash
    );
    taskEntries := [];
  };

  // ─── Helpers ────────────────────────────────────────────────────────────────

  func validateInput(input: TaskInput): ?Text {
    if (Text.size(input.title) == 0) return ?"Title cannot be empty";
    if (Text.size(input.title) > 500) return ?"Title too long (max 500 chars)";
    if (Text.size(input.description) > 50000) return ?"Description too long";
    null
  };

  // ─── Create ─────────────────────────────────────────────────────────────────

  public shared(msg) func createTask(input: TaskInput): async Result.Result<Task, TaskError> {
    switch (validateInput(input)) {
      case (?err) return #err(#InvalidInput(err));
      case null {};
    };

    let task: Task = {
      id = nextId;
      title = input.title;
      description = input.description;
      status = input.status;
      priority = input.priority;
      assignees = input.assignees;
      dueDate = input.dueDate;
      estimatedHours = input.estimatedHours;
      tags = input.tags;
      subtasks = input.subtasks;
      attachments = input.attachments;
      createdAt = Time.now();
      updatedAt = Time.now();
      createdBy = Principal.toText(msg.caller);
    };

    tasks.put(nextId, task);
    nextId += 1;
    #ok(task)
  };

  // ─── Read ───────────────────────────────────────────────────────────────────

  public query func getTask(id: Nat): async Result.Result<Task, TaskError> {
    switch (tasks.get(id)) {
      case null #err(#NotFound);
      case (?t) #ok(t);
    }
  };

  public query func getAllTasks(): async [Task] {
    Iter.toArray(tasks.vals())
  };

  public query func getTasksByStatus(status: TaskStatus): async [Task] {
    let all = Iter.toArray(tasks.vals());
    Array.filter<Task>(all, func(t) {
      switch (t.status, status) {
        case (#Todo, #Todo) true;
        case (#InProgress, #InProgress) true;
        case (#InReview, #InReview) true;
        case (#Done, #Done) true;
        case _ false;
      }
    })
  };

  public query func getTasksByPriority(priority: TaskPriority): async [Task] {
    let all = Iter.toArray(tasks.vals());
    Array.filter<Task>(all, func(t) {
      switch (t.priority, priority) {
        case (#Urgent, #Urgent) true;
        case (#High, #High) true;
        case (#Normal, #Normal) true;
        case (#Low, #Low) true;
        case _ false;
      }
    })
  };

  public query func searchTasks(query: Text): async [Task] {
    let q = Text.toLower(query);
    let all = Iter.toArray(tasks.vals());
    Array.filter<Task>(all, func(t) {
      Text.contains(Text.toLower(t.title), #text q) or
      Text.contains(Text.toLower(t.description), #text q)
    })
  };

  // ─── Update ─────────────────────────────────────────────────────────────────

  public shared func updateTask(id: Nat, input: TaskInput): async Result.Result<Task, TaskError> {
    switch (validateInput(input)) {
      case (?err) return #err(#InvalidInput(err));
      case null {};
    };

    switch (tasks.get(id)) {
      case null #err(#NotFound);
      case (?existing) {
        let updated: Task = {
          id = existing.id;
          title = input.title;
          description = input.description;
          status = input.status;
          priority = input.priority;
          assignees = input.assignees;
          dueDate = input.dueDate;
          estimatedHours = input.estimatedHours;
          tags = input.tags;
          subtasks = input.subtasks;
          attachments = input.attachments;
          createdAt = existing.createdAt;
          updatedAt = Time.now();
          createdBy = existing.createdBy;
        };
        tasks.put(id, updated);
        #ok(updated)
      };
    }
  };

  public shared func updateTaskStatus(id: Nat, status: TaskStatus): async Result.Result<Task, TaskError> {
    switch (tasks.get(id)) {
      case null #err(#NotFound);
      case (?t) {
        let updated = { t with status = status; updatedAt = Time.now() };
        tasks.put(id, updated);
        #ok(updated)
      };
    }
  };

  // ─── Subtasks ────────────────────────────────────────────────────────────────

  public shared func addSubtask(taskId: Nat, title: Text): async Result.Result<Task, TaskError> {
    if (Text.size(title) == 0) return #err(#InvalidInput("Subtask title cannot be empty"));
    switch (tasks.get(taskId)) {
      case null #err(#NotFound);
      case (?t) {
        let newSubtask: Subtask = {
          id = t.subtasks.size() + 1;
          title = title;
          completed = false;
        };
        let updated = {
          t with
          subtasks = Array.append(t.subtasks, [newSubtask]);
          updatedAt = Time.now();
        };
        tasks.put(taskId, updated);
        #ok(updated)
      };
    }
  };

  public shared func toggleSubtask(taskId: Nat, subtaskId: Nat): async Result.Result<Task, TaskError> {
    switch (tasks.get(taskId)) {
      case null #err(#NotFound);
      case (?t) {
        let updatedSubtasks = Array.map<Subtask, Subtask>(t.subtasks, func(s) {
          if (s.id == subtaskId) { { s with completed = not s.completed } }
          else s
        });
        let updated = { t with subtasks = updatedSubtasks; updatedAt = Time.now() };
        tasks.put(taskId, updated);
        #ok(updated)
      };
    }
  };

  // ─── Delete ─────────────────────────────────────────────────────────────────

  public shared func deleteTask(id: Nat): async Result.Result<(), TaskError> {
    switch (tasks.get(id)) {
      case null #err(#NotFound);
      case _ {
        tasks.delete(id);
        #ok(())
      };
    }
  };

  // ─── Stats (for dashboard) ───────────────────────────────────────────────────

  public query func getStats(): async {
    total: Nat;
    todo: Nat;
    inProgress: Nat;
    inReview: Nat;
    done: Nat;
  } {
    var todo = 0;
    var inProgress = 0;
    var inReview = 0;
    var done = 0;

    for (t in tasks.vals()) {
      switch (t.status) {
        case #Todo { todo += 1 };
        case #InProgress { inProgress += 1 };
        case #InReview { inReview += 1 };
        case #Done { done += 1 };
      }
    };

    {
      total = tasks.size();
      todo = todo;
      inProgress = inProgress;
      inReview = inReview;
      done = done;
    }
  };
}
