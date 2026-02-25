import { useState, useEffect, JSX } from "react";

// ── Types ──────────────────────────────────────────────────────────────────

type Priority = "high" | "med" | "low";
type AppointmentStatus = "confirmed" | "completed" | "pending" | "cancelled";
type FilterOption = "all" | AppointmentStatus;

interface Task {
    id: number;
    text: string;
    priority: Priority;
    done: boolean;
}

interface Appointment {
    id: number;
    name: string;
    pid: string;
    time: string;
    type: string;
    room: string;
    status: AppointmentStatus;
    avatar: string;
}

// ── Styles ─────────────────────────────────────────────────────────────────

const styles = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:ital,wght@0,300;0,400;0,500;1,300&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  body {
    font-family: 'DM Sans', sans-serif;
    background: #f0f4fa;
    min-height: 100vh;
    color: #1a1d2e;
  }

  .dashboard {
    min-height: 100vh;
    background: #f0f4fa;
    background-image: radial-gradient(ellipse at 20% 10%, rgba(99,71,255,0.07) 0%, transparent 50%),
                      radial-gradient(ellipse at 80% 80%, rgba(255,71,145,0.05) 0%, transparent 50%);
    padding: 40px;
  }

  .header { margin-bottom: 36px; }

  .header-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 11px;
    font-weight: 500;
    letter-spacing: 3px;
    text-transform: uppercase;
    color: #6347ff;
    margin-bottom: 8px;
  }

  .header-title {
    font-family: 'Syne', sans-serif;
    font-size: 36px;
    font-weight: 800;
    color: #1a1d2e;
    letter-spacing: -1px;
  }

  .grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 20px;
    max-width: 1100px;
  }

  .card {
    border-radius: 20px;
    padding: 28px;
    position: relative;
    overflow: hidden;
    transition: transform 0.25s ease, box-shadow 0.25s ease;
    cursor: default;
  }
  .card:hover { transform: translateY(-4px); }

  .card-date {
    background: linear-gradient(135deg, #6347ff 0%, #a17aff 100%);
    box-shadow: 0 8px 32px rgba(99,71,255,0.25);
  }
  .card-date::before {
    content: '';
    position: absolute;
    top: -40px; right: -40px;
    width: 160px; height: 160px;
    background: rgba(255,255,255,0.1);
    border-radius: 50%;
  }

  .card-total {
    background: #fff;
    border: 1px solid rgba(99,71,255,0.1);
    box-shadow: 0 4px 24px rgba(99,71,255,0.08);
  }

  .card-upcoming {
    background: linear-gradient(135deg, #ff4791 0%, #ff8c42 100%);
    box-shadow: 0 8px 32px rgba(255,71,145,0.22);
  }
  .card-upcoming::after {
    content: '';
    position: absolute;
    bottom: -30px; left: -30px;
    width: 130px; height: 130px;
    background: rgba(255,255,255,0.1);
    border-radius: 50%;
  }

  .card-tasks {
    background: #fff;
    border: 1px solid rgba(99,71,255,0.1);
    box-shadow: 0 4px 24px rgba(99,71,255,0.08);
    grid-column: span 2;
  }

  .card-stats {
    background: linear-gradient(135deg, #f0faf4 0%, #e6f7ed 100%);
    border: 1px solid rgba(34,197,94,0.2);
    box-shadow: 0 4px 24px rgba(34,197,94,0.1);
  }

  .card-appt-table {
    background: #fff;
    border: 1px solid rgba(99,71,255,0.1);
    box-shadow: 0 4px 24px rgba(99,71,255,0.08);
    grid-column: span 3;
  }

  .card-label {
    font-family: 'DM Sans', sans-serif;
    font-size: 10px;
    font-weight: 500;
    letter-spacing: 2.5px;
    text-transform: uppercase;
    color: #6b7280;
    margin-bottom: 16px;
  }

  .card-value {
    font-family: 'Syne', sans-serif;
    font-size: 56px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -2px;
  }

  .card-subtitle { font-size: 13px; color: #6b7280; margin-top: 8px; font-weight: 300; }

  .date-day { font-family: 'Syne', sans-serif; font-size: 72px; font-weight: 800; line-height: 1; letter-spacing: -3px; color: #fff; }
  .date-month-year { font-family: 'Syne', sans-serif; font-size: 18px; font-weight: 600; color: rgba(255,255,255,0.88); letter-spacing: 1px; margin-top: 4px; }
  .date-weekday { font-size: 11px; letter-spacing: 3px; text-transform: uppercase; color: rgba(255,255,255,0.65); margin-top: 10px; font-weight: 500; }

  .appt-time { font-family: 'Syne', sans-serif; font-size: 32px; font-weight: 700; color: #fff; margin-bottom: 4px; }
  .appt-name { font-size: 15px; font-weight: 500; color: rgba(255,255,255,0.95); margin-bottom: 2px; }
  .appt-type { font-size: 12px; color: rgba(255,255,255,0.7); font-weight: 300; }

  .appt-badge {
    display: inline-flex; align-items: center; gap: 5px;
    background: rgba(255,255,255,0.25); border-radius: 20px;
    padding: 4px 12px; font-size: 11px; font-weight: 500;
    color: #fff; margin-top: 16px; backdrop-filter: blur(10px);
  }

  .dot { width: 6px; height: 6px; background: #fff; border-radius: 50%; animation: pulse 2s infinite; }
  @keyframes pulse { 0%, 100% { opacity: 1; transform: scale(1); } 50% { opacity: 0.5; transform: scale(0.8); } }

  .task-list { list-style: none; display: flex; flex-direction: column; gap: 10px; margin-top: 4px; }
  .task-item {
    display: flex; align-items: center; gap: 12px; padding: 10px 14px;
    background: #f8f9ff; border-radius: 10px;
    border: 1px solid rgba(99,71,255,0.08); transition: background 0.2s, border-color 0.2s;
  }
  .task-item:hover { background: #f0edff; border-color: rgba(99,71,255,0.18); }

  .task-check {
    width: 18px; height: 18px; border-radius: 50%; border: 2px solid #c4b8ff;
    flex-shrink: 0; display: flex; align-items: center; justify-content: center;
    cursor: pointer; transition: all 0.2s;
  }
  .task-check.done { background: #22c55e; border-color: #22c55e; }
  .task-check.done::after { content: 'checkmark'; font-size: 10px; color: #fff; font-weight: 700; }

  .task-text { font-size: 13px; flex: 1; color: #374151; }
  .task-text.done { text-decoration: line-through; opacity: 0.4; }

  .task-priority { font-size: 10px; padding: 2px 8px; border-radius: 10px; font-weight: 500; letter-spacing: 0.5px; }
  .priority-high { background: rgba(239,68,68,0.1);   color: #dc2626; }
  .priority-med  { background: rgba(245,158,11,0.12); color: #d97706; }
  .priority-low  { background: rgba(34,197,94,0.12);  color: #16a34a; }

  .stat-row { display: flex; align-items: center; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid rgba(34,197,94,0.12); }
  .stat-row:last-child { border-bottom: none; }
  .stat-label { font-size: 12px; color: #6b7280; }
  .stat-val { font-family: 'Syne', sans-serif; font-size: 20px; font-weight: 700; color: #16a34a; }

  .progress-bar { height: 4px; background: rgba(99,71,255,0.1); border-radius: 2px; margin-top: 16px; overflow: hidden; }
  .progress-fill {
    height: 100%; background: linear-gradient(90deg, #6347ff, #a17aff);
    border-radius: 2px; animation: grow 1.2s ease-out forwards;
  }
  @keyframes grow { from { width: 0%; } to { width: var(--w); } }

  .icon { font-size: 22px; margin-bottom: 12px; display: block; }

  .table-header-row {
    display: flex; align-items: flex-start;
    justify-content: space-between; margin-bottom: 20px;
    flex-wrap: wrap; gap: 12px;
  }

  .filter-tabs { display: flex; gap: 6px; flex-wrap: wrap; }

  .filter-tab {
    padding: 5px 14px; border-radius: 20px; font-size: 11px;
    font-weight: 500; border: none; cursor: pointer; transition: all 0.2s;
    background: #f0f4fa; color: #6b7280; font-family: 'DM Sans', sans-serif;
  }
  .filter-tab.active { background: #6347ff; color: #fff; }
  .filter-tab:hover:not(.active) { background: #e5e9f5; }

  .appt-table { width: 100%; border-collapse: collapse; }
  .appt-table thead tr { border-bottom: 2px solid #f0f4fa; }
  .appt-table th {
    text-align: left; font-size: 10px; font-weight: 600;
    letter-spacing: 2px; text-transform: uppercase; color: #9ca3af;
    padding: 0 12px 12px 12px;
  }
  .appt-table th:first-child { padding-left: 0; }
  .appt-table th:last-child  { text-align: right; }

  .appt-table tbody tr { border-bottom: 1px solid #f8f9ff; transition: background 0.15s; }
  .appt-table tbody tr:last-child { border-bottom: none; }
  .appt-table tbody tr:hover { background: #fafbff; }

  .appt-table td { padding: 11px 12px; font-size: 13px; color: #374151; vertical-align: middle; }
  .appt-table td:first-child { padding-left: 0; }
  .appt-table td:last-child  { text-align: right; }

  .patient-cell { display: flex; align-items: center; gap: 10px; }
  .patient-avatar {
    width: 34px; height: 34px; border-radius: 50%;
    display: flex; align-items: center; justify-content: center;
    font-size: 12px; font-weight: 700; flex-shrink: 0; color: #fff;
  }
  .patient-name { font-weight: 500; color: #1a1d2e; font-size: 13px; }
  .patient-id   { font-size: 11px; color: #9ca3af; margin-top: 1px; }

  .time-cell { font-family: 'Syne', sans-serif; font-weight: 600; color: #6347ff; font-size: 13px; }

  .status-badge {
    display: inline-flex; align-items: center; gap: 5px;
    padding: 3px 10px; border-radius: 20px; font-size: 11px; font-weight: 500;
  }
  .status-dot { width: 5px; height: 5px; border-radius: 50%; }

  .status-confirmed  { background: rgba(99,71,255,0.1);  color: #6347ff; }
  .status-confirmed  .status-dot { background: #6347ff; }
  .status-completed  { background: rgba(34,197,94,0.1);  color: #16a34a; }
  .status-completed  .status-dot { background: #16a34a; }
  .status-pending    { background: rgba(245,158,11,0.1); color: #d97706; }
  .status-pending    .status-dot { background: #d97706; }
  .status-cancelled  { background: rgba(239,68,68,0.1);  color: #dc2626; }
  .status-cancelled  .status-dot { background: #dc2626; }

  .type-tag { font-size: 11px; padding: 3px 10px; border-radius: 8px; background: #f0f4fa; color: #6b7280; }

  .action-btn {
    background: none; border: 1px solid rgba(99,71,255,0.22);
    color: #6347ff; font-size: 11px; font-weight: 500;
    padding: 5px 12px; border-radius: 8px; cursor: pointer;
    transition: all 0.2s; font-family: 'DM Sans', sans-serif;
  }
  .action-btn:hover { background: #6347ff; color: #fff; border-color: #6347ff; }

  .empty-state { text-align: center; padding: 32px; color: #9ca3af; font-size: 13px; }

  @media (max-width: 768px) {
    .grid { grid-template-columns: 1fr; }
    .card-tasks      { grid-column: span 1; }
    .card-appt-table { grid-column: span 1; }
    .dashboard { padding: 20px; }
    .appt-table { min-width: 600px; }
    .card-appt-table { overflow-x: auto; }
  }
`;

// ── Constants ──────────────────────────────────────────────────────────────

const DAYS: string[] = [
    "Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday",
];
const MONTHS: string[] = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
];
const FILTERS: FilterOption[] = ["all", "confirmed", "completed", "pending", "cancelled"];

// ── Static data ────────────────────────────────────────────────────────────

const initialTasks: Task[] = [
    { id: 1, text: "Send follow-up email to Dr. Patel", priority: "high", done: false },
    { id: 2, text: "Update patient records for morning session", priority: "med", done: false },
    { id: 3, text: "Confirm tomorrow's schedule with reception", priority: "low", done: true },
    { id: 4, text: "Review lab results for J. Morrison", priority: "high", done: false },
];

const allAppointments: Appointment[] = [
    { id: 1, name: "Sarah Mitchell", pid: "#P-00142", time: "9:00 AM", type: "Annual Check-up", room: "Room 3", status: "completed", avatar: "#6347ff" },
    { id: 2, name: "James Okafor", pid: "#P-00289", time: "10:15 AM", type: "Follow-up", room: "Room 1", status: "completed", avatar: "#ff4791" },
    { id: 3, name: "Linda Tran", pid: "#P-00374", time: "11:30 AM", type: "Consultation", room: "Room 2", status: "completed", avatar: "#ff8c42" },
    { id: 4, name: "Marcus Reid", pid: "#P-00451", time: "1:00 PM", type: "Lab Review", room: "Room 3", status: "confirmed", avatar: "#22c55e" },
    { id: 5, name: "Priya Nair", pid: "#P-00512", time: "2:30 PM", type: "Annual Check-up", room: "Room 1", status: "confirmed", avatar: "#a17aff" },
    { id: 6, name: "Tom Hargreaves", pid: "#P-00603", time: "3:45 PM", type: "Prescription", room: "Room 2", status: "pending", avatar: "#f59e0b" },
    { id: 7, name: "Aisha Kamara", pid: "#P-00718", time: "4:30 PM", type: "Follow-up", room: "Room 1", status: "pending", avatar: "#06b6d4" },
    { id: 8, name: "Daniel Svensson", pid: "#P-00823", time: "5:15 PM", type: "Consultation", room: "Room 3", status: "cancelled", avatar: "#9ca3af" },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function getInitials(name: string): string {
    return name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .slice(0, 2)
        .toUpperCase();
}

function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

// ── Sub-components ─────────────────────────────────────────────────────────

interface TaskItemProps {
    task: Task;
    onToggle: (id: number) => void;
}

function TaskItem({ task, onToggle }: TaskItemProps): JSX.Element {
    return (
        <li className="task-item" onClick={() => onToggle(task.id)}>
            <div className={`task-check ${task.done ? "done" : ""}`} />
            <span className={`task-text ${task.done ? "done" : ""}`}>{task.text}</span>
            <span className={`task-priority priority-${task.priority}`}>{task.priority}</span>
        </li>
    );
}

interface AppointmentRowProps {
    appointment: Appointment;
}

function AppointmentRow({ appointment }: AppointmentRowProps): JSX.Element {
    const { name, pid, time, type, room, status, avatar } = appointment;
    return (
        <tr>
            <td>
                <div className="patient-cell">
                    <div className="patient-avatar" style={{ background: avatar }}>
                        {getInitials(name)}
                    </div>
                    <div>
                        <div className="patient-name">{name}</div>
                        <div className="patient-id">{pid}</div>
                    </div>
                </div>
            </td>
            <td><span className="time-cell">{time}</span></td>
            <td><span className="type-tag">{type}</span></td>
            <td style={{ color: "#6b7280" }}>{room}</td>
            <td>
                <span className={`status-badge status-${status}`}>
                    <span className="status-dot" />
                    {capitalize(status)}
                </span>
            </td>
            <td>
                <button className="action-btn">View</button>
            </td>
        </tr>
    );
}

// ── Main Component ─────────────────────────────────────────────────────────

export default function Dashboard({ ...props }): JSX.Element {

    const { user, authToken } = props;

    const [now, setNow] = useState<Date>(new Date());
    const [tasks, setTasks] = useState<Task[]>(initialTasks);
    const [apptFilter, setFilter] = useState<FilterOption>("all");

    useEffect(() => {
        const timer = setInterval(() => setNow(new Date()), 60_000);
        return () => clearInterval(timer);
    }, []);

    const toggleTask = (id: number): void => {
        setTasks((prev) =>
            prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t))
        );
    };

    const pendingCount: number = tasks.filter((t) => !t.done).length;

    const visibleAppointments: Appointment[] =
        apptFilter === "all"
            ? allAppointments
            : allAppointments.filter((a) => a.status === apptFilter);

    return (
        <>
            <style>{styles}</style>
            <div className="dashboard">

                {/* ── Header ── */}
                <div className="header">
                    <p className="header-label">Medical Practice</p>
                    <h1 className="header-title">Good morning, Dr. {user.name} 👋</h1>
                </div>

                <div className="grid">

                    {/* 1 – Date Display */}
                    <div className="card card-date">
                        <p className="card-label" style={{ color: "rgba(255,255,255,0.65)" }}>Today</p>
                        <div className="date-day">{String(now.getDate()).padStart(2, "0")}</div>
                        <div className="date-month-year">{MONTHS[now.getMonth()]} {now.getFullYear()}</div>
                        <div className="date-weekday">{DAYS[now.getDay()]}</div>
                    </div>

                    {/* 2 – Total Appointments Today */}
                    <div className="card card-total">
                        <span className="icon">📅</span>
                        <p className="card-label">Total Appointments Today</p>
                        <div className="card-value" style={{ color: "#6347ff" }}>12</div>
                        <p className="card-subtitle">8 completed · 4 remaining</p>
                        <div className="progress-bar" style={{ marginTop: "20px" }}>
                            <div className="progress-fill" style={{ "--w": "67%" } as React.CSSProperties} />
                        </div>
                    </div>

                    {/* 3 – Upcoming Appointment */}
                    <div className="card card-upcoming">
                        <p className="card-label" style={{ color: "rgba(255,255,255,0.65)" }}>Next Appointment</p>
                        <div className="appt-time">2:30 PM</div>
                        <p className="appt-name">Priya Nair</p>
                        <p className="appt-type">Annual check-up · Room 1</p>
                        <div className="appt-badge">
                            <span className="dot" />
                            In 45 minutes
                        </div>
                    </div>

                    {/* 4 – Pending Tasks */}
                    <div className="card card-tasks">
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" }}>
                            <p className="card-label" style={{ marginBottom: 0 }}>Pending Tasks</p>
                            <span style={{
                                fontFamily: "'Syne', sans-serif",
                                fontSize: "22px",
                                fontWeight: 700,
                                color: pendingCount > 0 ? "#dc2626" : "#16a34a",
                            }}>
                                {pendingCount} left
                            </span>
                        </div>
                        <ul className="task-list">
                            {tasks.map((task) => (
                                <TaskItem key={task.id} task={task} onToggle={toggleTask} />
                            ))}
                        </ul>
                    </div>

                    {/* 5 – Weekly Stats */}
                    <div className="card card-stats">
                        <span className="icon">📊</span>
                        <p className="card-label">Weekly Overview</p>
                        <div className="stat-row">
                            <span className="stat-label">Appointments</span>
                            <span className="stat-val">58</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Completed</span>
                            <span className="stat-val">51</span>
                        </div>
                        <div className="stat-row">
                            <span className="stat-label">Cancelled</span>
                            <span className="stat-val" style={{ color: "#dc2626" }}>7</span>
                        </div>
                    </div>

                    {/* 6 – Appointments Table */}
                    <div className="card card-appt-table">
                        <div className="table-header-row">
                            <div>
                                <p className="card-label" style={{ marginBottom: 4 }}>My Appointments — Dr. Chen</p>
                                <p style={{ fontSize: "12px", color: "#9ca3af" }}>
                                    {visibleAppointments.length}{" "}
                                    {apptFilter === "all" ? "total today" : apptFilter}
                                </p>
                            </div>
                            <div className="filter-tabs">
                                {FILTERS.map((f) => (
                                    <button
                                        key={f}
                                        className={`filter-tab ${apptFilter === f ? "active" : ""}`}
                                        onClick={() => setFilter(f)}
                                    >
                                        {capitalize(f)}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <table className="appt-table">
                            <thead>
                                <tr>
                                    <th>Patient</th>
                                    <th>Time</th>
                                    <th>Type</th>
                                    <th>Room</th>
                                    <th>Status</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {visibleAppointments.length === 0 ? (
                                    <tr>
                                        <td colSpan={6} className="empty-state">
                                            No {apptFilter} appointments for today.
                                        </td>
                                    </tr>
                                ) : (
                                    visibleAppointments.map((appt) => (
                                        <AppointmentRow key={appt.id} appointment={appt} />
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                </div>
            </div>
        </>
    );
}
