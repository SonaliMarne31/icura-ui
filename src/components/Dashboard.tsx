import { useState, useEffect, useCallback, useMemo, JSX } from "react";
import "./Dashboard.css";

// ─── TYPES ────────────────────────────────────────────────────
type FilterStatus = "all" | "scheduled" | "completed" | "cancelled" | "no_show";
type Priority = "high" | "medium" | "low";
type TabId = "appointments" | "tasks" | "analytics";

interface BFFClaims {
    doctorId: string; clinicId: string; clinicName: string;
    name: string; role: string; sub: string; exp: number;
}


interface Appointment {
    id: string;
    patient_id: string;
    doctorId: string;
    clinicId: string;
    first_name: string;
    last_name: string;
    dob: string;
    phone: string;
    email: string;
    appointment_type: string;
    status: string;
    reason: string;
    notes: string | null;
    start_time: string;
    end_time: string;
    timezone: string;
    durationMinutes: number;
    room: string;
    insuranceVerified: boolean;
    copayCollected: boolean;
    insurance: string;
}

interface Task {
    id: string; doctorId: string; clinicId: string;
    title: string; description: string;
    status: "pending" | "completed"; priority: Priority;
    category: string; dueDate: string;
}

interface DashboardProps {
    user: BFFClaims;
    bffToken: string;
}


function toCamelCase(type: string): string {
    return type
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // ["General", "Checkup"]
        .join(' ');
}


function calcDuration(start_time: string, end_time: string): number {
    const start = new Date(start_time);
    const end = new Date(end_time);
    return Math.round((end.getTime() - start.getTime()) / 60000); // returns minutes
}
const getAppointments = async (doctorId: string, clinicId: string, bffToken: string | null): Promise<Appointment[]> => {
    if (!bffToken) throw new Error('No token provided');

    const response = await fetch('http://localhost:8080/appointments', {
        headers: {
            'Authorization': `Bearer ${bffToken}`,
            'Content-Type': 'application/json',
        },
    });

    if (!response.ok) throw new Error('Failed to fetch appointments');

    const data = await response.json();
    const raw: any[] = Array.isArray(data) ? data : data.appts;

   //  assign map result to variable
    const mapped: Appointment[] = raw.map((a: any, i: number) => ({
        id: a.id,
        doctorId: a.doctor_id ?? doctorId,
        clinicId: a.clinic_id ?? clinicId,
        patient_id: a.patient_id,
        first_name: a.first_name,
        last_name: a.last_name,
        dob: a.dob,
        phone: a.phone,
        email: a.email,
        insurance: a.insurance ?? "N/A",
        status: a.status,
        reason: a.reason ?? "",
        notes: a.notes ?? (a.status === "completed" ? "Patient reviewed. Follow-up in 6 weeks." : null),
        start_time: a.start_time,
        end_time: a.end_time,
        durationMinutes: calcDuration(a.start_time, a.end_time),
        timezone: a.timezone ?? "America/Chicago",
        room: `Room ${(i % 4) + 1}`,
        insuranceVerified: i % 5 !== 0,
        copayCollected: a.status === "completed",
        appointment_type: toCamelCase(a.appointment_type ?? "general"),
    }));

    console.log('mapped appts:', mapped);//  now has correct values

   //  sort and return mapped — not raw
    return mapped.sort((a, b) => new Date(a.start_time).getTime() - new Date(b.start_time).getTime());
}


const makeTasks = async (doctorId: string, clinicId: string, bffToken: string | null): Promise<Task[]> => {

    const response = await fetch('http://localhost:8080/pendingTasks', {
        headers: {
            'Authorization': `Bearer ${bffToken}`,
            'Content-Type': 'application/json',
        },

    });
    if (!response.ok) throw new Error('Failed to fetch tasks');
    const data = await response.json();
    console.log('tasks response:', data); // 👈 log the variable, not response.json()

    // then use based on what BFF returns
    const tasks = Array.isArray(data) ? data : data.tasks;
    // setTasks(tasks);


    const now = new Date();
    return tasks.map((t: any) => ({  //  removed ? from params
        id: t.id,
        doctorId,
        clinicId,
        title: t.title,
        description: t.description,
        priority: t.priority,
        category: t.category,
        status: t.status,
        dueDate: new Date(now).toISOString(),
    }));

}

// ─── HELPERS ──────────────────────────────────────────────────
function calcAge(dob: string): number {
    const today = new Date(), birth = new Date(dob);
    let age = today.getFullYear() - birth.getFullYear();
    if (today.getMonth() < birth.getMonth() || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate())) age--;
    return age;
}
function fmtDate(iso: string, tz = "America/Chicago"): string {
    try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, month: "short", day: "numeric", year: "numeric" }).format(new Date(iso)); }
    catch { return iso; }
}
function fmtTime(iso: string, tz = "America/Chicago"): string {
    try { return new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", hour12: true }).format(new Date(iso)); }
    catch { return iso; }
}
function getInitials(f: string, l: string): string { return `${f[0]}${l[0]}`.toUpperCase(); }

const AVATAR_COLORS = ["#1B5E40", "#1E40AF", "#B45309", "#0F766E", "#5B21B6", "#9F1239", "#374151"];
function avatarColor(id: string): string { return AVATAR_COLORS[parseInt(id.replace(/\D/g, ""), 10) % AVATAR_COLORS.length]; }

// ─── SVG ICONS ────────────────────────────────────────────────
type IconName = "calendar" | "clock" | "user" | "checkSquare" | "activity" | "alertCircle" | "trendUp" | "edit" | "filter" | "logout" | "refresh" | "close" | "check" | "info" | "building" | "stethoscope" | "phone" | "mail" | "shield";

function Ico({ name, size = 16, color = "currentColor" }: { name: IconName; size?: number; color?: string }): JSX.Element {
    const d: Record<IconName, JSX.Element> = {
        calendar: <><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>,
        clock: <><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>,
        user: <><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></>,
        checkSquare: <><polyline points="9 11 12 14 22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></>,
        activity: <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />,
        alertCircle: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></>,
        trendUp: <><polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" /></>,
        edit: <><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" /><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" /></>,
        filter: <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />,
        logout: <><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></>,
        refresh: <><polyline points="23 4 23 10 17 10" /><polyline points="1 20 1 14 7 14" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" /></>,
        close: <><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>,
        check: <polyline points="20 6 9 17 4 12" />,
        info: <><circle cx="12" cy="12" r="10" /><line x1="12" y1="16" x2="12" y2="12" /><line x1="12" y1="8" x2="12.01" y2="8" /></>,
        building: <><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>,
        stethoscope: <><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" /><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" /><circle cx="20" cy="10" r="2" /></>,
        phone: <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.15 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.06 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />,
        mail: <><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" /></>,
        shield: <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />,
    };
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
            stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            {d[name]}
        </svg>
    );
}

function Spinner({ size = 18 }: { size?: number }): JSX.Element {
    return <div className="spinner" style={{ width: size, height: size }} />;
}

// ─── RESCHEDULE MODAL ─────────────────────────────────────────
interface RescheduleModalProps {
    appointment: Appointment;
    onClose: () => void;
    onSave: (id: string, start: string, end: string, reason: string) => Promise<void>;
}

function RescheduleModal({ appointment, onClose, onSave }: RescheduleModalProps): JSX.Element {
    const tz = appointment.timezone || "America/Chicago";
    const apptDate = new Date(appointment.start_time);
    const [date, setDate] = useState(apptDate.toLocaleDateString("en-CA", { timeZone: tz }));
    const [time, setTime] = useState(apptDate.toLocaleTimeString("en-GB", { timeZone: tz, hour: "2-digit", minute: "2-digit" }));
    const [reason, setReason] = useState("");
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const today = new Date().toLocaleDateString("en-CA");

    function addMins(t: string, m: number): string {
        const [h, min] = t.split(":").map(Number);
        const tot = h * 60 + min + m;
        return `${String(Math.floor(tot / 60)).padStart(2, "0")}:${String(tot % 60).padStart(2, "0")}`;
    }

    async function handleSave(): Promise<void> {
        setError("");
        if (!date || !time) { setError("Please select a date and time."); return; }
        if (date < today) { setError("Cannot schedule in the past."); return; }
        const newStart = new Date(`${date}T${time}:00`);
        const newEnd = new Date(newStart.getTime() + appointment.durationMinutes * 60000);
        setSaving(true);
        try { await onSave(appointment.id, newStart.toISOString(), newEnd.toISOString(), reason); }
        catch (e) { setError(e instanceof Error ? e.message : "Save failed."); }
        finally { setSaving(false); }
    }

    return (
        <div className="modal-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="modal-box">
                <div className="modal-header">
                    <div>
                        <div className="modal-title">Reschedule Appointment</div>
                        <div className="modal-subtitle">{appointment.first_name} {appointment.last_name} · {appointment.appointment_type}</div>
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><Ico name="close" size={18} /></button>
                </div>
                <div className="modal-body">
                    <div className="modal-current-box">
                        <div className="modal-current-label">Current Schedule</div>
                        <div className="modal-current-time">{fmtDate(appointment.start_time, tz)}, {fmtTime(appointment.start_time, tz)} · {appointment.durationMinutes} min</div>
                        <div className="modal-current-tz">Timezone: {tz}</div>
                    </div>
                    <div className="modal-form-grid">
                        <div>
                            <label className="modal-field-label">New Date</label>
                            <input type="date" className="modal-input" value={date} min={today} onChange={e => setDate(e.target.value)} />
                        </div>
                        <div>
                            <label className="modal-field-label">New Time</label>
                            <input type="time" className="modal-input" value={time} onChange={e => setTime(e.target.value)} />
                        </div>
                    </div>
                    <div style={{ marginBottom: 16 }}>
                        <label className="modal-field-label">Reason (optional)</label>
                        <select className="modal-select" value={reason} onChange={e => setReason(e.target.value)}>
                            <option value="">Select reason…</option>
                            <option>Patient request</option>
                            <option>Provider conflict</option>
                            <option>Room unavailability</option>
                            <option>Patient illness</option>
                            <option>Insurance issue</option>
                            <option>Other</option>
                        </select>
                    </div>
                    {date && time && (
                        <div className="modal-preview-box">
                            <div className="modal-preview-label">New Schedule Preview</div>
                            <div className="modal-preview-time">
                                {new Date(`${date}T${time}`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })} at {new Date(`${date}T${time}`).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })} → {addMins(time, appointment.durationMinutes)} · {appointment.durationMinutes} min
                            </div>
                        </div>
                    )}
                    {error && <div className="modal-error"><Ico name="alertCircle" size={14} color="#9F1239" />{error}</div>}
                    <div className="modal-footer">
                        <button className="modal-cancel-btn" onClick={onClose}>Cancel</button>
                        <button className="modal-confirm-btn" onClick={handleSave} disabled={saving}>
                            {saving ? <><Spinner size={14} /> Saving…</> : <><Ico name="check" size={14} color="#fff" /> Confirm Reschedule</>}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── APPOINTMENT DRAWER ───────────────────────────────────────
function AppointmentDrawer({ appointment, onClose, onReschedule }: { appointment: Appointment; onClose: () => void; onReschedule: (a: Appointment) => void }): JSX.Element {
    const { timezone } = appointment;
    const age = calcAge(appointment.dob);
    return (
        <div className="drawer-overlay" onClick={e => e.target === e.currentTarget && onClose()}>
            <div className="drawer">
                <div className="drawer-header">
                    <div>
                        <div className="drawer-title">{appointment.id}</div>
                        <StatusBadge status={appointment.status} />
                    </div>
                    <button className="modal-close-btn" onClick={onClose}><Ico name="close" size={18} /></button>
                </div>
                <div className="drawer-body">
                    <DrawerSection title="Patient">
                        <DrawerRow icon="user" label="Name" value={`${appointment.first_name} ${appointment.last_name}`} bold />
                        <DrawerRow icon="calendar" label="DOB" value={`${appointment.dob} (Age ${age})`} />
                        <DrawerRow icon="phone" label="Phone" value={appointment.phone} />
                        <DrawerRow icon="mail" label="Email" value={appointment.email} />
                        <DrawerRow icon="shield" label="Insurance" value={appointment.insurance} />
                    </DrawerSection>
                    <DrawerSection title="Appointment">
                        <DrawerRow icon="clock" label="Start" value={`${fmtDate(appointment.start_time, timezone)}, ${fmtTime(appointment.start_time, timezone)}`} bold />
                        <DrawerRow icon="clock" label="End" value={fmtTime(appointment.end_time, timezone)} />
                        <DrawerRow icon="activity" label="Type" value={appointment.appointment_type} />
                        <DrawerRow icon="building" label="Room" value={appointment.room} />
                        <DrawerRow icon="info" label="Timezone" value={timezone} />
                    </DrawerSection>
                    <DrawerSection title="Clinical">
                        <div style={{ marginBottom: 10 }}>
                            <div className="modal-field-label">Reason for Visit</div>
                            <div style={{ fontSize: 13, color: "#1A1714", lineHeight: 1.5 }}>{appointment.reason}</div>
                        </div>
                        {appointment.notes && (
                            <div>
                                <div className="modal-field-label">Notes</div>
                                <div className="drawer-notes-box">{appointment.notes}</div>
                            </div>
                        )}
                    </DrawerSection>
                    <DrawerSection title="Administrative">
                        <DrawerRow icon="shield" label="Insurance Verified" value={appointment.insuranceVerified ? "✓ Yes" : "⚠ Pending"} bold={appointment.insuranceVerified} />
                        <DrawerRow icon="check" label="Copay Collected" value={appointment.copayCollected ? "✓ Yes" : "Not yet"} />
                    </DrawerSection>
                    {appointment.status === "scheduled" && (
                        <button className="drawer-reschedule-btn" onClick={() => onReschedule(appointment)}>
                            <Ico name="edit" size={15} color="currentColor" /> Reschedule Appointment
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}

function DrawerSection({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
    return (
        <div style={{ marginBottom: 24 }}>
            <div className="drawer-section-title">{title}</div>
            {children}
        </div>
    );
}

function DrawerRow({ icon, label, value, bold }: { icon: IconName; label: string; value: string; bold?: boolean }): JSX.Element {
    return (
        <div className="drawer-row">
            <Ico name={icon} size={14} color="#9C9389" />
            <span className="drawer-row-label">{label}</span>
            <span className={`drawer-row-value${bold ? " bold" : ""}`}>{value}</span>
        </div>
    );
}

function StatusBadge({ status }: { status: string }): JSX.Element {
    const label = status === "no_show" ? "No Show" : status.charAt(0).toUpperCase() + status.slice(1);
    return (
        <span className={`status-badge status-${status}`}>
            <span className="status-dot" /> {label}
        </span>
    );
}

// ─── MAIN DASHBOARD ───────────────────────────────────────────
export default function Dashboard({ user, bffToken }: DashboardProps): JSX.Element {
    const [activeTab, setActiveTab] = useState<TabId>("appointments");
    const [appointments, setAppointments] = useState<Appointment[]>([]);
    const [tasks, setTasks] = useState<Task[]>([]);
    const [loading, setLoading] = useState(true);
    const [filters, setFilters] = useState({ status: "all" as FilterStatus, type: "all", dateFrom: "", dateTo: "" });
    const [pendingFilters, setPendingFilters] = useState(filters);
    const [showFilters, setShowFilters] = useState(false);
    const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
    const [rescheduleAppt, setRescheduleAppt] = useState<Appointment | null>(null);
    const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

    const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
        setToast({ msg, type });
        setTimeout(() => setToast(null), 3500);
    }, []);

    // Load data (replace with real fetch calls)
    // useEffect(() => {
    //     setLoading(true);
    //     setTimeout(() => {
    //         setAppointments(makeAppointments(user.doctorId, user.clinicId));
    //         makeTasks(user.doctorId, user.clinicId, bffToken);

    //         setLoading(false);
    //     }, 600);
    // }, [user.doctorId, user.clinicId]);

    useEffect(() => {
        setLoading(true);

        const loadData = async () => {
            try {
                const [mappedAppts, taskList] = await Promise.all([
                    getAppointments(user.doctorId, user.clinicId, bffToken),
                    makeTasks(user.doctorId, user.clinicId, bffToken),       //  now awaited
                ]);
                setAppointments(mappedAppts);
                setTasks(taskList);
            } catch (err) {
                console.error("Failed to load dashboard data:", err);
            } finally {
                setLoading(false);
            }
        };

        loadData();
    }, [user.doctorId, user.clinicId]);


    // Derived metrics
    const now = new Date();
    const upcoming = useMemo(() => appointments.filter(a => a.status === "scheduled" && new Date(a.start_time) > now), [appointments]);
    const pendingTasks = useMemo(() => tasks.filter(t => t.status === "pending"), [tasks]);
    const completedPast = useMemo(() => appointments.filter(a => a.status === "completed"), [appointments]);
    const noShowCount = useMemo(() => appointments.filter(a => a.status === "no_show").length, [appointments]);
    const noShowRate = appointments.length ? `${((noShowCount / appointments.length) * 100).toFixed(1)}%` : "—";
    const completionRate = appointments.filter(a => a.status !== "scheduled").length ? `${Math.round((completedPast.length / appointments.filter(a => a.status !== "scheduled").length) * 100)}%` : "—";
    const telehealth = appointments.length ? `${Math.round((appointments.filter(a => a.appointment_type === "Telehealth").length / appointments.length) * 100)}%` : "—";
    const avgDuration = 0; //appointments.length ? `${Math.round(appointments.reduce((s, a) => s + a.durationMinutes, 0) / appointments.length)} min` : "—";

    // Filtered appointments
    const filtered = useMemo(() => {
        let r = appointments;
        if (filters.status !== "all") r = r.filter(a => a.status === filters.status);
        if (filters.type !== "all") r = r.filter(a => a.appointment_type === filters.type);
        if (filters.dateFrom) r = r.filter(a => new Date(a.start_time) >= new Date(filters.dateFrom));
        if (filters.dateTo) { const e = new Date(filters.dateTo); e.setHours(23, 59, 59); r = r.filter(a => new Date(a.start_time) <= e); }
        return r;
    }, [appointments, filters]);

    const allTypes = useMemo(() => Array.from(new Set(appointments.map(a => a.appointment_type))).sort(), [appointments]);

    const activeFilterCount = Object.entries(filters).filter(([, v]) => v && v !== "all").length;

    const greeting = (): string => { const h = now.getHours(); return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening"; };

    async function handleReschedule(id: string, start_time: string, end_time: string, reason: string): Promise<void> {

        const response = await fetch(`http://localhost:8080/appointments/${id}/reschedule`, {
            method: "PATCH",
            headers: {
                'Authorization': `Bearer ${bffToken}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ start_time, end_time, reason }),

        });
        if (!response.ok) throw new Error('Failed to update appointments');

        const updatedAppointment = await response.json();
        // ✓ replace the old appointment in the list with the updated one
        setAppointments(prev =>
            prev.map(appt =>
                appt.id === id ? updatedAppointment : appt
            )
        );
        setRescheduleAppt(null);
        setSelectedAppt(null);
        showToast("Appointment rescheduled successfully.");
    }


    function clearFilters(): void {
        const reset = { status: "all" as FilterStatus, type: "all", dateFrom: "", dateTo: "" };
        setFilters(reset); setPendingFilters(reset);
    }

    return (
        <div className="dashboard-page">
            {/* ── NAV ── */}
            <nav className="dashboard-nav">
                <div className="dashboard-nav-left">
                    <div className="dashboard-logo">
                        <div className="dashboard-logo-icon">
                            <Ico name="stethoscope" size={15} color="#fff" />
                        </div>
                        <span className="dashboard-logo-name">MedPortal</span>
                    </div>
                    <div className="dashboard-nav-divider" />
                    <div className="dashboard-nav-tabs">
                        {([
                            { id: "appointments", label: "Appointments", icon: "calendar" },
                            { id: "tasks", label: "Tasks", icon: "checkSquare" },
                            { id: "analytics", label: "Analytics", icon: "activity" },
                        ] as { id: TabId; label: string; icon: IconName }[]).map(tab => (
                            <button key={tab.id} className={`dashboard-nav-tab${activeTab === tab.id ? " active" : ""}`}
                                onClick={() => setActiveTab(tab.id)}>
                                <Ico name={tab.icon} size={14} color={activeTab === tab.id ? "#1B5E40" : "#9C9389"} />
                                {tab.label}
                                {tab.id === "tasks" && pendingTasks.length > 0 && (
                                    <span className="dashboard-nav-tab-badge">{pendingTasks.length}</span>
                                )}
                            </button>
                        ))}
                    </div>
                </div>
                <div className="dashboard-nav-right">
                    <div className="dashboard-nav-user-info">
                        <div className="dashboard-nav-user-name">Dr. {user.name}</div>
                        <div className="dashboard-nav-user-sub">
                            {user.clinicName} · <span className="dashboard-nav-user-id">{user.doctorId}</span>
                        </div>
                    </div>
                    <div className="dashboard-nav-avatar">
                        <span className="dashboard-nav-avatar-initials">
                            {getInitials(user.name.split(" ")[0] ?? user.name, user.name.split(" ")[1] ?? "")}
                        </span>
                    </div>
                    <button className="dashboard-logout-btn">
                        <Ico name="logout" size={14} /> Sign out
                    </button>
                </div>
            </nav>

            {/* ── MAIN ── */}
            <main className="dashboard-main">
                {/* Page header */}
                <div className="dashboard-page-header">
                    <div>
                        <p className="dashboard-greeting-label">
                            <Ico name="building" size={12} color="#9C9389" />
                            {user.clinicName} · {now.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}
                        </p>
                        <h1 className="dashboard-greeting-title">
                            {greeting()}, <em className="dashboard-greeting-em">Dr. {user.name.split(" ").slice(-1)[0]}</em>
                        </h1>
                    </div>
                    <div className="dashboard-jwt-strip">
                        <span className="dashboard-jwt-label">JWT claims: </span>
                        doctorId={user.doctorId} · clinicId={user.clinicId} · role={user.role}
                    </div>
                </div>

                {/* Metric cards */}
                <div className="dashboard-metrics">
                    {[
                        { icon: "calendar" as IconName, accent: "blue", bg: "bg-blue", label: "Upcoming Appointments", value: String(upcoming.length), sub: "Next 30 days", delay: 0 },
                        { icon: "checkSquare" as IconName, accent: "amber", bg: "bg-amber", label: "Pending Tasks", value: String(pendingTasks.length), sub: "Require action", delay: 50 },
                        { icon: "check" as IconName, accent: "green", bg: "bg-green", label: "Completion Rate", value: completionRate, sub: "Past appointments", delay: 100 },
                        { icon: "alertCircle" as IconName, accent: "rose", bg: "bg-rose", label: "No-Show Rate", value: noShowRate, sub: "Industry avg ~18%", delay: 150 },
                        { icon: "activity" as IconName, accent: "teal", bg: "bg-teal", label: "Telehealth Usage", value: telehealth, sub: "Of all appointments", delay: 200 },
                        { icon: "clock" as IconName, accent: "purple", bg: "bg-purple", label: "Avg Visit Duration", value: avgDuration, sub: "Across all types", delay: 250 },
                    ].map(m => (
                        <div key={m.label} className={`metric-card accent-${m.accent}`} style={{ animationDelay: `${m.delay}ms` }}>
                            <div className={`metric-icon-wrap ${m.bg}`}>
                                <Ico name={m.icon} size={18} color={
                                    m.accent === "blue" ? "#1E40AF" : m.accent === "amber" ? "#B45309" :
                                        m.accent === "green" ? "#1B5E40" : m.accent === "rose" ? "#9F1239" :
                                            m.accent === "teal" ? "#0F766E" : "#5B21B6"
                                } />
                            </div>
                            <div className="metric-value">{m.value}</div>
                            <div className="metric-label">{m.label}</div>
                            <div className="metric-subtext">{m.sub}</div>
                        </div>
                    ))}
                </div>

                {/* ── APPOINTMENTS TAB ── */}
                {activeTab === "appointments" && (
                    <div className="dashboard-card" style={{ animationDelay: "0ms" }}>
                        {/* Toolbar */}
                        <div style={{ padding: "20px 20px 0" }}>
                            <div className="dashboard-card-toolbar">
                                <div>
                                    <span className="dashboard-card-title">Appointment Schedule</span>
                                    {appointments.length > 0 && (
                                        <span className="dashboard-card-count">({filtered.length} results)</span>
                                    )}
                                </div>
                                <div className="dashboard-toolbar-right">
                                    <button className={`dashboard-icon-btn${activeFilterCount > 0 ? " filter-active" : ""}`} onClick={() => setShowFilters(s => !s)}>
                                        <Ico name="filter" size={13} color={activeFilterCount > 0 ? "#1B5E40" : "#9C9389"} />
                                        Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
                                    </button>
                                    {activeFilterCount > 0 && (
                                        <button className="dashboard-icon-btn" onClick={clearFilters}>Clear</button>
                                    )}
                                    <button className="dashboard-icon-btn" onClick={() => { setLoading(true); setTimeout(() => setLoading(false), 600); }}>
                                        <Ico name="refresh" size={13} />
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Filter panel */}
                        {showFilters && (
                            <div className="dashboard-filter-panel">
                                <div>
                                    <label className="filter-field-label">Status</label>
                                    <select className="filter-select" value={pendingFilters.status} onChange={e => setPendingFilters(f => ({ ...f, status: e.target.value as FilterStatus }))}>
                                        <option value="all">All statuses</option>
                                        <option value="scheduled">Scheduled</option>
                                        <option value="completed">Completed</option>
                                        <option value="cancelled">Cancelled</option>
                                        <option value="no_show">No Show</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="filter-field-label">Type</label>
                                    <select className="filter-select" value={pendingFilters.type} onChange={e => setPendingFilters(f => ({ ...f, type: e.target.value }))}>
                                        <option value="all">All types</option>
                                        {allTypes.map(t => <option key={t} value={t}>{t}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label className="filter-field-label">From</label>
                                    <input type="date" className="filter-input" value={pendingFilters.dateFrom} onChange={e => setPendingFilters(f => ({ ...f, dateFrom: e.target.value }))} style={{ width: 150 }} />
                                </div>
                                <div>
                                    <label className="filter-field-label">To</label>
                                    <input type="date" className="filter-input" value={pendingFilters.dateTo} onChange={e => setPendingFilters(f => ({ ...f, dateTo: e.target.value }))} style={{ width: 150 }} />
                                </div>
                                <button className="filter-apply-btn" onClick={() => { setFilters({ ...pendingFilters }); setShowFilters(false); }}>Apply</button>
                                <button className="filter-clear-btn" onClick={clearFilters}>Clear</button>
                            </div>
                        )}

                        {/* Table */}
                        <div className="appt-table-wrap">
                            <table className="appt-table">
                                <thead className="appt-table-header">
                                    <tr>
                                        {["Date & Time", "Patient", "Type", "Reason", "Status", "Duration", ""].map(h => (
                                            <th key={h}>{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        Array.from({ length: 5 }).map((_, i) => (
                                            <tr key={i} className="skeleton-row">
                                                {[120, 140, 90, 160, 80, 60, 40].map((w, j) => (
                                                    <td key={j}><div className="skeleton" style={{ width: w }} /></td>
                                                ))}
                                            </tr>
                                        ))
                                    ) : !filtered.length ? (
                                        <tr><td colSpan={7} className="table-empty">
                                            <Ico name="calendar" size={28} color="#E8E3D9" /><br />
                                            <span style={{ marginTop: 8, display: "block" }}>No appointments match the selected filters</span>
                                        </td></tr>
                                    ) : filtered.map(appt => {
                                        const isToday = new Date(appt.start_time).toDateString() === now.toDateString();
                                        return (
                                            <tr key={appt.id} className={isToday ? "row-today" : ""} onClick={() => setSelectedAppt(appt)}>
                                                <td>
                                                    <span className="time-cell">{fmtDate(appt.start_time, appt.timezone)}</span>
                                                    <span className="time-cell-tz">{fmtTime(appt.start_time, appt.timezone)}{isToday && <span className="today-badge">TODAY</span>}</span>
                                                </td>
                                                <td>
                                                    <div className="patient-cell">
                                                        <div className="patient-avatar" >
                                                            {getInitials(appt.first_name, appt.last_name)}
                                                        </div>
                                                        <div>
                                                            <div className="patient-name">{appt.first_name} {appt.last_name}</div>
                                                            <div className="patient-meta">Age {calcAge(appt.dob)} · {appt.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td><span className="type-tag">{appt.appointment_type}</span></td>
                                                <td style={{ maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }} title={appt.reason}>{appt.reason}</td>
                                                <td><StatusBadge status={appt.status} /></td>
                                                <td style={{ fontFamily: "'JetBrains Mono',monospace", fontSize: 12, color: "#9C9389" }}>{appt.durationMinutes}m</td>
                                                <td onClick={e => e.stopPropagation()}>
                                                    {appt.status === "scheduled" && (
                                                        <button className="reschedule-btn" onClick={() => setRescheduleAppt(appt)} title="Reschedule">
                                                            <Ico name="edit" size={13} />
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>

                        {/* Footer */}
                        <div className="appt-table-footer">
                            <span>{filtered.length} appointments</span>
                            <span className="appt-table-footer-id">clinicId: {user.clinicId} · doctorId: {user.doctorId}</span>
                        </div>
                    </div>
                )}

                {/* ── TASKS TAB ── */}
                {activeTab === "tasks" && (
                    <div style={{ animation: "slideUp 0.3s ease both" }}>
                        <h2 className="dashboard-card-title" style={{ marginBottom: 16 }}>Task Queue</h2>
                        <div className="tasks-grid">
                            <div>
                                <div className="tasks-section-title pending">
                                    <span className="tasks-section-dot" /> Pending ({pendingTasks.length})
                                </div>
                                {pendingTasks.map(task => (
                                    <div key={task.id} className={`task-card priority-${task.priority}`}>
                                        <div className="task-card-top">
                                            <span className="task-card-title">{task.title}</span>
                                            <span className={`task-priority-badge ${task.priority}`}>{task.priority}</span>
                                        </div>
                                        <div className="task-card-meta">
                                            <span className="task-category-tag">{task.category}</span>
                                            <span className={`task-due${new Date(task.dueDate) < now ? " overdue" : ""}`}>
                                                Due {fmtDate(task.dueDate)}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div>
                                <div className="tasks-section-title completed">
                                    <span className="tasks-section-dot" /> Completed ({tasks.filter(t => t.status === "completed").length})
                                </div>
                                {tasks.filter(t => t.status === "completed").map(task => (
                                    <div key={task.id} className="task-done-row">
                                        <Ico name="check" size={14} color="#1B5E40" />
                                        <span className="task-done-title">{task.title}</span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* ── ANALYTICS TAB ── */}
                {activeTab === "analytics" && (
                    <div style={{ animation: "slideUp 0.3s ease both" }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20, flexWrap: "wrap", gap: 10 }}>
                            <h2 className="dashboard-card-title">Clinical Analytics</h2>
                            <span style={{ fontSize: 12, color: "#9C9389", background: "#F1F5F9", padding: "4px 10px", borderRadius: 20 }}>
                                Research-backed benchmarks
                            </span>
                        </div>
                        <div className="analytics-grid">
                            {[
                                { title: "Patient No-Show Rate", value: noShowRate, color: "#9F1239", benchmark: "Benchmark: 5–8%", benchBg: "#FFF1F2", description: "High no-show rates reduce daily revenue by 14–18% per physician. SMS reminders 48h and 2h before appointments reduce no-shows by up to 38%.", why: "Each missed slot represents lost clinical capacity and care continuity risk.", source: "JAMA Intern Med. 2020;180(9):1193-1200" },
                                { title: "Appointment Completion Rate", value: completionRate, color: "#1B5E40", benchmark: "Benchmark: 88–94% (MGMA 2023)", benchBg: "#E8F2ED", description: "Completion rate tracks appointments honored. Top-quartile primary care practices maintain >92%.", why: "Completion rate directly predicts chronic disease management outcomes.", source: "MGMA DataDive Provider & Staff (2023)" },
                                { title: "Telehealth Utilization", value: telehealth, color: "#0F766E", benchmark: "Benchmark: 20–35% (McKinsey 2022)", benchBg: "#F0FDFA", description: "Optimal 20–35% mix maximises access without compromising care quality.", why: "Telehealth reduces patient travel burden by avg 40 miles per visit.", source: "McKinsey & Company (2021)" },
                                { title: "Average Visit Duration", value: avgDuration, color: "#5B21B6", benchmark: "Benchmark: 18–24 min (AMA 2022)", benchBg: "#F5F3FF", description: "Avg face time affects both throughput and CAHPS satisfaction scores. Visits <10 min correlate with lower satisfaction.", why: "Optimizing visit duration balances daily volume against burnout risk.", source: "AMA Physician Practice Benchmark Survey 2022" },
                                { title: "Pending Task Burden", value: `${pendingTasks.length} tasks`, color: "#B45309", benchmark: "Benchmark: <10 open tasks", benchBg: "#FEF3C7", description: "Inbox burden is a leading predictor of physician burnout. EHR tasks account for 1–2 hours nightly.", why: "Reducing admin burden is the #1 intervention for physician satisfaction.", source: "Shanafelt TD et al., Mayo Clinic Proceedings (2022)" },
                                { title: "Upcoming Appointment Density", value: `${upcoming.length} appts`, color: "#1E40AF", benchmark: "Optimal: 15–22/day (IHI)", benchBg: "#EFF6FF", description: "Time to Third Next Available (TNA) is the IHI gold standard for access. Dense schedules without buffer increase patient wait times.", why: "TNA <1 week is associated with higher satisfaction and better disease control.", source: "IHI Open Access Scheduling (2023)" },
                            ].map((m, i) => (
                                <div key={m.title} className="analytics-card" style={{ animationDelay: `${i * 60}ms` }}>
                                    <div className="analytics-card-accent" style={{ background: m.color }} />
                                    <div className="analytics-card-body">
                                        <div className="analytics-card-header">
                                            <span className="analytics-card-title">{m.title}</span>
                                            <span className="analytics-card-value" style={{ color: m.color }}>{m.value}</span>
                                        </div>
                                        <span className="analytics-benchmark" style={{ background: m.benchBg, color: m.color }}>{m.benchmark}</span>
                                        <p className="analytics-description">{m.description}</p>
                                        <p className="analytics-why"><strong>Why it matters:</strong> {m.why}</p>
                                        <p className="analytics-source">{m.source}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </main>

            {/* Appointment drawer */}
            {selectedAppt && !rescheduleAppt && (
                <AppointmentDrawer
                    appointment={selectedAppt}
                    onClose={() => setSelectedAppt(null)}
                    onReschedule={a => { setRescheduleAppt(a); setSelectedAppt(null); }}
                />
            )}

            {/* Reschedule modal */}
            {rescheduleAppt && (
                <RescheduleModal
                    appointment={rescheduleAppt}
                    onClose={() => setRescheduleAppt(null)}
                    onSave={handleReschedule}
                />
            )}

            {/* Toast */}
            {toast && (
                <div className={`toast ${toast.type}`}>
                    <Ico name={toast.type === "error" ? "alertCircle" : "check"} size={16} color="#fff" />
                    {toast.msg}
                </div>
            )}
        </div>
    );
}