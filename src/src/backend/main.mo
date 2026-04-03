import Principal "mo:base/Principal";
import Text "mo:base/Text";
import Nat "mo:base/Nat";
import Time "mo:base/Time";
import Array "mo:base/Array";
import HashMap "mo:base/HashMap";
import Iter "mo:base/Iter";

persistent actor {

  // ========== TYPES ==========

  public type ProjectStatus = { #PLANNING; #ACTIVE; #ON_HOLD; #COMPLETED; #CANCELLED };
  public type Priority = { #LOW; #MEDIUM; #HIGH; #URGENT };
  public type TaskStatus = { #TODO; #IN_PROGRESS; #IN_REVIEW; #DONE };
  public type NotifType = { #TASK_ASSIGNED; #TASK_UPDATED; #DOC_UPDATED; #PROJECT_UPDATED };
  public type EntityType = { #TASK; #DOCUMENT };

  public type Project = {
    id: Text;
    name: Text;
    description: Text;
    status: ProjectStatus;
    priority: Priority;
    ownerId: Principal;
    memberIds: [Principal];
    createdAt: Int;
    updatedAt: Int;
    dueDate: ?Int;
  };

  public type Task = {
    id: Text;
    projectId: Text;
    title: Text;
    description: Text;
    status: TaskStatus;
    priority: Priority;
    assigneeId: ?Principal;
    reporterId: Principal;
    createdAt: Int;
    updatedAt: Int;
    dueDate: ?Int;
    tags: [Text];
  };

  public type Document = {
    id: Text;
    projectId: Text;
    title: Text;
    content: Text;
    authorId: Principal;
    createdAt: Int;
    updatedAt: Int;
    version: Nat;
    fileUrl: ?Text;
  };

  public type Notification = {
    id: Text;
    userId: Principal;
    message: Text;
    notifType: NotifType;
    relatedId: Text;
    isRead: Bool;
    createdAt: Int;
  };

  public type Comment = {
    id: Text;
    entityId: Text;
    entityType: EntityType;
    authorId: Principal;
    content: Text;
    createdAt: Int;
  };

  public type Activity = {
    id: Text;
    actorId: Principal;
    action: Text;
    entityType: Text;
    entityId: Text;
    timestamp: Int;
  };

  public type DashboardStats = {
    totalProjects: Nat;
    totalTasks: Nat;
    todoCount: Nat;
    inProgressCount: Nat;
    inReviewCount: Nat;
    doneCount: Nat;
    recentActivities: [Activity];
  };

  // ========== STABLE STORAGE (for upgrades) ==========

  var projectEntries: [(Text, Project)] = [];
  var taskEntries: [(Text, Task)] = [];
  var documentEntries: [(Text, Document)] = [];
  var notificationEntries: [(Text, Notification)] = [];
  var commentEntries: [(Text, Comment)] = [];
  var activityEntries: [(Text, Activity)] = [];
  var nextId: Nat = 1;

  // ========== RUNTIME STATE (non-stable HashMaps) ==========

  transient var projects = HashMap.fromIter<Text, Project>(projectEntries.vals(), 10, Text.equal, Text.hash);
  transient var tasks = HashMap.fromIter<Text, Task>(taskEntries.vals(), 10, Text.equal, Text.hash);
  transient var documents = HashMap.fromIter<Text, Document>(documentEntries.vals(), 10, Text.equal, Text.hash);
  transient var notifications = HashMap.fromIter<Text, Notification>(notificationEntries.vals(), 10, Text.equal, Text.hash);
  transient var comments = HashMap.fromIter<Text, Comment>(commentEntries.vals(), 10, Text.equal, Text.hash);
  transient var activityLog = HashMap.fromIter<Text, Activity>(activityEntries.vals(), 10, Text.equal, Text.hash);

  system func preupgrade() {
    projectEntries := Iter.toArray(projects.entries());
    taskEntries := Iter.toArray(tasks.entries());
    documentEntries := Iter.toArray(documents.entries());
    notificationEntries := Iter.toArray(notifications.entries());
    commentEntries := Iter.toArray(comments.entries());
    activityEntries := Iter.toArray(activityLog.entries());
  };

  system func postupgrade() {
    projects := HashMap.fromIter<Text, Project>(projectEntries.vals(), 10, Text.equal, Text.hash);
    tasks := HashMap.fromIter<Text, Task>(taskEntries.vals(), 10, Text.equal, Text.hash);
    documents := HashMap.fromIter<Text, Document>(documentEntries.vals(), 10, Text.equal, Text.hash);
    notifications := HashMap.fromIter<Text, Notification>(notificationEntries.vals(), 10, Text.equal, Text.hash);
    comments := HashMap.fromIter<Text, Comment>(commentEntries.vals(), 10, Text.equal, Text.hash);
    activityLog := HashMap.fromIter<Text, Activity>(activityEntries.vals(), 10, Text.equal, Text.hash);
  };

  func genId() : Text {
    let id = Nat.toText(nextId);
    nextId += 1;
    id
  };

  func logActivity(actor_: Principal, action: Text, entityType: Text, entityId: Text) {
    let id = genId();
    let entry : Activity = {
      id = id;
      actorId = actor_;
      action = action;
      entityType = entityType;
      entityId = entityId;
      timestamp = Time.now();
    };
    activityLog.put(id, entry);
  };

  // ========== PROJECTS ==========

  public shared(msg) func createProject(name: Text, description: Text, status: ProjectStatus, priority: Priority, dueDate: ?Int) : async Project {
    let id = genId();
    let now = Time.now();
    let p : Project = {
      id = id;
      name = name;
      description = description;
      status = status;
      priority = priority;
      ownerId = msg.caller;
      memberIds = [msg.caller];
      createdAt = now;
      updatedAt = now;
      dueDate = dueDate;
    };
    projects.put(id, p);
    logActivity(msg.caller, "CREATE", "PROJECT", id);
    p
  };

  public query func getProjects() : async [Project] {
    Iter.toArray(projects.vals())
  };

  public query func getProject(id: Text) : async ?Project {
    projects.get(id)
  };

  public shared(msg) func updateProject(id: Text, name: Text, description: Text, status: ProjectStatus, priority: Priority, dueDate: ?Int, memberIds: [Principal]) : async ?Project {
    switch (projects.get(id)) {
      case null { null };
      case (?p) {
        let updated : Project = {
          id = p.id;
          name = name;
          description = description;
          status = status;
          priority = priority;
          ownerId = p.ownerId;
          memberIds = memberIds;
          createdAt = p.createdAt;
          updatedAt = Time.now();
          dueDate = dueDate;
        };
        projects.put(id, updated);
        logActivity(msg.caller, "UPDATE", "PROJECT", id);
        ?updated
      };
    }
  };

  public shared(msg) func deleteProject(id: Text) : async Bool {
    switch (projects.remove(id)) {
      case null { false };
      case (?_) {
        logActivity(msg.caller, "DELETE", "PROJECT", id);
        true
      };
    }
  };

  // ========== TASKS ==========

  public shared(msg) func createTask(projectId: Text, title: Text, description: Text, status: TaskStatus, priority: Priority, assigneeId: ?Principal, dueDate: ?Int, tags: [Text]) : async Task {
    let id = genId();
    let now = Time.now();
    let t : Task = {
      id = id;
      projectId = projectId;
      title = title;
      description = description;
      status = status;
      priority = priority;
      assigneeId = assigneeId;
      reporterId = msg.caller;
      createdAt = now;
      updatedAt = now;
      dueDate = dueDate;
      tags = tags;
    };
    tasks.put(id, t);
    logActivity(msg.caller, "CREATE", "TASK", id);
    switch (assigneeId) {
      case (?assignee) {
        let nId = genId();
        let notif : Notification = {
          id = nId;
          userId = assignee;
          message = "You have been assigned to task: " # title;
          notifType = #TASK_ASSIGNED;
          relatedId = id;
          isRead = false;
          createdAt = now;
        };
        notifications.put(nId, notif);
      };
      case null {};
    };
    t
  };

  public query func getTasks() : async [Task] {
    Iter.toArray(tasks.vals())
  };

  public query func getTasksByProject(projectId: Text) : async [Task] {
    let all = Iter.toArray(tasks.vals());
    Array.filter(all, func(t: Task) : Bool { t.projectId == projectId })
  };

  public query func getTask(id: Text) : async ?Task {
    tasks.get(id)
  };

  public shared(msg) func updateTask(id: Text, title: Text, description: Text, status: TaskStatus, priority: Priority, assigneeId: ?Principal, dueDate: ?Int, tags: [Text]) : async ?Task {
    switch (tasks.get(id)) {
      case null { null };
      case (?t) {
        let updated : Task = {
          id = t.id;
          projectId = t.projectId;
          title = title;
          description = description;
          status = status;
          priority = priority;
          assigneeId = assigneeId;
          reporterId = t.reporterId;
          createdAt = t.createdAt;
          updatedAt = Time.now();
          dueDate = dueDate;
          tags = tags;
        };
        tasks.put(id, updated);
        logActivity(msg.caller, "UPDATE", "TASK", id);
        ?updated
      };
    }
  };

  public shared(msg) func deleteTask(id: Text) : async Bool {
    switch (tasks.remove(id)) {
      case null { false };
      case (?_) {
        logActivity(msg.caller, "DELETE", "TASK", id);
        true
      };
    }
  };

  // ========== DOCUMENTS ==========

  public shared(msg) func createDocument(projectId: Text, title: Text, content: Text, fileUrl: ?Text) : async Document {
    let id = genId();
    let now = Time.now();
    let d : Document = {
      id = id;
      projectId = projectId;
      title = title;
      content = content;
      authorId = msg.caller;
      createdAt = now;
      updatedAt = now;
      version = 1;
      fileUrl = fileUrl;
    };
    documents.put(id, d);
    logActivity(msg.caller, "CREATE", "DOCUMENT", id);
    d
  };

  public query func getDocuments() : async [Document] {
    Iter.toArray(documents.vals())
  };

  public query func getDocumentsByProject(projectId: Text) : async [Document] {
    let all = Iter.toArray(documents.vals());
    Array.filter(all, func(d: Document) : Bool { d.projectId == projectId })
  };

  public query func getDocument(id: Text) : async ?Document {
    documents.get(id)
  };

  public shared(msg) func updateDocument(id: Text, title: Text, content: Text, fileUrl: ?Text) : async ?Document {
    switch (documents.get(id)) {
      case null { null };
      case (?d) {
        let updated : Document = {
          id = d.id;
          projectId = d.projectId;
          title = title;
          content = content;
          authorId = d.authorId;
          createdAt = d.createdAt;
          updatedAt = Time.now();
          version = d.version + 1;
          fileUrl = fileUrl;
        };
        documents.put(id, updated);
        logActivity(msg.caller, "UPDATE", "DOCUMENT", id);
        ?updated
      };
    }
  };

  public shared(msg) func deleteDocument(id: Text) : async Bool {
    switch (documents.remove(id)) {
      case null { false };
      case (?_) {
        logActivity(msg.caller, "DELETE", "DOCUMENT", id);
        true
      };
    }
  };

  // ========== NOTIFICATIONS ==========

  public query(msg) func getMyNotifications() : async [Notification] {
    let all = Iter.toArray(notifications.vals());
    Array.filter(all, func(n: Notification) : Bool { Principal.equal(n.userId, msg.caller) })
  };

  public shared(_msg) func markNotificationRead(id: Text) : async Bool {
    switch (notifications.get(id)) {
      case null { false };
      case (?n) {
        let updated : Notification = {
          id = n.id;
          userId = n.userId;
          message = n.message;
          notifType = n.notifType;
          relatedId = n.relatedId;
          isRead = true;
          createdAt = n.createdAt;
        };
        notifications.put(id, updated);
        true
      };
    }
  };

  public shared(msg) func markAllNotificationsRead() : async Nat {
    var count = 0;
    for ((id, n) in notifications.entries()) {
      if (Principal.equal(n.userId, msg.caller) and not n.isRead) {
        let updated : Notification = {
          id = n.id;
          userId = n.userId;
          message = n.message;
          notifType = n.notifType;
          relatedId = n.relatedId;
          isRead = true;
          createdAt = n.createdAt;
        };
        notifications.put(id, updated);
        count += 1;
      };
    };
    count
  };

  // ========== COMMENTS ==========

  public shared(msg) func addComment(entityId: Text, entityType: EntityType, content: Text) : async Comment {
    let id = genId();
    let c : Comment = {
      id = id;
      entityId = entityId;
      entityType = entityType;
      authorId = msg.caller;
      content = content;
      createdAt = Time.now();
    };
    comments.put(id, c);
    c
  };

  public query func getComments(entityId: Text) : async [Comment] {
    let all = Iter.toArray(comments.vals());
    Array.filter(all, func(c: Comment) : Bool { c.entityId == entityId })
  };

  public shared(_msg) func deleteComment(id: Text) : async Bool {
    switch (comments.remove(id)) {
      case null { false };
      case (?_) { true };
    }
  };

  // ========== ACTIVITY / DASHBOARD ==========

  public query func getRecentActivity(limit: Nat) : async [Activity] {
    let all = Iter.toArray(activityLog.vals());
    let sorted = Array.sort(all, func(a: Activity, b: Activity) : { #less; #equal; #greater } {
      if (a.timestamp > b.timestamp) { #less }
      else if (a.timestamp < b.timestamp) { #greater }
      else { #equal }
    });
    if (sorted.size() <= limit) { sorted } else {
      Array.tabulate(limit, func(i: Nat) : Activity { sorted[i] })
    }
  };

  public query func getDashboardStats() : async DashboardStats {
    let allTasks = Iter.toArray(tasks.vals());
    let todoCount = Array.filter(allTasks, func(t: Task) : Bool {
      switch (t.status) { case (#TODO) { true }; case (_) { false } }
    }).size();
    let inProgressCount = Array.filter(allTasks, func(t: Task) : Bool {
      switch (t.status) { case (#IN_PROGRESS) { true }; case (_) { false } }
    }).size();
    let inReviewCount = Array.filter(allTasks, func(t: Task) : Bool {
      switch (t.status) { case (#IN_REVIEW) { true }; case (_) { false } }
    }).size();
    let doneCount = Array.filter(allTasks, func(t: Task) : Bool {
      switch (t.status) { case (#DONE) { true }; case (_) { false } }
    }).size();
    let allActs = Iter.toArray(activityLog.vals());
    let sorted = Array.sort(allActs, func(a: Activity, b: Activity) : { #less; #equal; #greater } {
      if (a.timestamp > b.timestamp) { #less }
      else if (a.timestamp < b.timestamp) { #greater }
      else { #equal }
    });
    let recent = if (sorted.size() <= 5) { sorted } else {
      Array.tabulate(5, func(i: Nat) : Activity { sorted[i] })
    };
    {
      totalProjects = projects.size();
      totalTasks = tasks.size();
      todoCount = todoCount;
      inProgressCount = inProgressCount;
      inReviewCount = inReviewCount;
      doneCount = doneCount;
      recentActivities = recent;
    }
  };
}
