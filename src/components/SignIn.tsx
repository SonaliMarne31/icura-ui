import {
    Alert, Box, Button, Chip, FormControl,
    FormLabel, IconButton, InputAdornment,
    Link, TextField, Typography,
} from '@mui/material';
import React from 'react';
import { useForm } from 'react-hook-form';
import { loginSchema, LoginFormValues } from './LoginSchema';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth0 } from '@auth0/auth0-react';
import { jwtDecode } from 'jwt-decode';
import Dashboard from './Dashboard';
import './SignIn.css';

// ─── TYPES ────────────────────────────────────────────────────
interface BFFClaims {
    sub: string;
    doctorId: string;
    clinicId: string;
    clinicName: string;
    name: string;
    role: string;
    iat: number;
    exp: number;
}

// ─── HELPERS ──────────────────────────────────────────────────
function decodeJWT(token: unknown): BFFClaims | null {
    try {
        if (!token || typeof token !== 'string') return null;
        if (token.split('.').length !== 3) return null;
        return jwtDecode<BFFClaims>(token);
    } catch (e) {
        console.error('JWT decode failed:', e);
        return null;
    }
}

const EyeIcon = ({ open }: { open: boolean }) => (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
        stroke="currentColor" strokeWidth="2"
        strokeLinecap="round" strokeLinejoin="round">
        {open
            ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></>
            : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" /><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" /><line x1="1" y1="1" x2="23" y2="23" /></>
        }
    </svg>
);

// ─── SESSION ────────────────────────────────────────────────
const SESSION_KEY_TOKEN  = "bff_token";
const SESSION_KEY_CLAIMS = "bff_claims";

function saveSession(token: string, claims: BFFClaims): void {
    sessionStorage.setItem(SESSION_KEY_TOKEN,  token);
    sessionStorage.setItem(SESSION_KEY_CLAIMS, JSON.stringify(claims));
}

function loadSession(): { token: string; claims: BFFClaims } | null {
    try {
        const token  = sessionStorage.getItem(SESSION_KEY_TOKEN);
        const claims = sessionStorage.getItem(SESSION_KEY_CLAIMS);

        if (!token || !claims) return null;

        const decoded = JSON.parse(claims) as BFFClaims;

        // check token not expired before restoring
        if (decoded.exp * 1000 < Date.now()) {
            clearSession();   // expired
            return null;
        }

        return { token, claims: decoded };
    } catch {
        clearSession();
        return null;
    }
}

function clearSession(): void {
    sessionStorage.removeItem(SESSION_KEY_TOKEN);
    sessionStorage.removeItem(SESSION_KEY_CLAIMS);
}

// ─── COMPONENT ────────────────────────────────────────────────
function SignIn() {

    // load session
    const savedSession = loadSession();


    const { getAccessTokenSilently, loginWithRedirect } = useAuth0();

    const [loginError, setLoginError] = React.useState<string | null>(null);
    const [showPass,   setShowPass]   = React.useState(false);
    const [loading,    setLoading]    = React.useState(false);

    const [bffToken, setBffToken] = React.useState<string>(savedSession?.token   ?? "");
    const [claims,   setClaims]   = React.useState<BFFClaims | null>(savedSession?.claims ?? null);
    const [showHome, setShowHome] = React.useState<boolean>(!!savedSession);


    const { register, handleSubmit, formState: { errors } } = useForm<LoginFormValues>({
        resolver: zodResolver(loginSchema),
        defaultValues: { email: '', password: '', clinicCode: '' },
    });

    function handleLogout() {
   //  clear all auth state
        setBffToken('');
        setClaims(null);
        setShowHome(false);
        clearSession();
    }

   
    const onSubmit = async (data: LoginFormValues) => {
        try {
            setLoginError(null);
            setLoading(true);
            let authToken: string;
            try {
                authToken = await getAccessTokenSilently();
            } catch(tokenErr: any) {
                console.log('Auth0 error:', tokenErr.error);

            if (
                tokenErr.error === 'login_required' ||
                tokenErr.error === 'consent_required' ||
                tokenErr.error === 'missing_refresh_token'
            ) {
               //  re-establish Auth0 session then come back
                await loginWithRedirect({
                    authorizationParams: {
                        redirect_uri: window.location.origin,
                    }
                });
                return;
            }
            throw tokenErr;
            }
            

            const response = await fetch('http://localhost:8080/registerClaims', {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${authToken}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email:      data.email,
                    password:   data.password,
                    clinicCode: data.clinicCode,
                }),
            });

            if (!response.ok) {
                const errorBody = await response.json().catch(() => null);
                throw new Error(errorBody?.error || 'Invalid credentials');
            }

            const result  = await response.json();
            const decoded = decodeJWT(result.token);
            if (!decoded) throw new Error('Invalid token received');


            saveSession(result.token, decoded);

            setClaims(decoded);
            setShowHome(true);
            setBffToken(result.token);

        } catch (err) {
            setLoginError(err instanceof Error ? err.message : 'Invalid credentials');
        } finally {
            setLoading(false);
        }
    };

    if (showHome && claims) {
        return <Dashboard user={claims} bffToken={bffToken} handleLogout={handleLogout}/>;
    }

    return (
        <div className="signin-page">

            {/* ── LEFT PANEL ── */}
            <div className="signin-left-panel">
                <div className="signin-circle signin-circle-1" />
                <div className="signin-circle signin-circle-2" />
                <div className="signin-circle signin-circle-3" />
                <div className="signin-circle signin-circle-4" />
                <div className="signin-blob" />

                {/* Logo */}
                <div className="signin-logo">
                    <div className="signin-logo-icon">
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                            stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3" />
                            <path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4" />
                            <circle cx="20" cy="10" r="2" />
                        </svg>
                    </div>
                    <span className="signin-logo-name">MedPortal</span>
                </div>

                {/* Headline */}
                <div style={{ flex: 1 }}>
                    <Typography className="signin-headline">
                        Clinical intelligence<br />
                        <em className="signin-headline-em">for modern practice</em>
                    </Typography>
                    <Typography className="signin-subtext">
                        Secure, multi-tenant access to your clinic's patient data,
                        appointments, and clinical workflows.
                    </Typography>

                    {/* Trust badges */}
                    <div className="signin-badges">
                        {['HIPAA Compliant', 'SOC 2 Type II', 'AES-256', 'HL7 FHIR R4'].map(b => (
                            <Chip key={b} label={b} size="small" className="signin-badge" />
                        ))}
                    </div>
                </div>

                {/* Stats */}
                <div className="signin-stats">
                    {[
                        { n: '12,400+', label: 'Active physicians' },
                        { n: '3.2M',    label: 'Appointments/yr'  },
                        { n: '99.9%',   label: 'Uptime SLA'       },
                        { n: '<100ms',  label: 'API response'     },
                    ].map(s => (
                        <div key={s.n} className="signin-stat-box">
                            <Typography className="signin-stat-number">{s.n}</Typography>
                            <Typography className="signin-stat-label">{s.label}</Typography>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── RIGHT PANEL ── */}
            <div className="signin-right-panel">
                <div className="signin-form-card">

                    <Typography className="signin-form-title">Welcome back</Typography>
                    <Typography className="signin-form-subtitle">
                        Sign in to your physician portal
                    </Typography>

                    {/* Auth error */}
                    {loginError && (
                        <Alert severity="error" variant="outlined" className="signin-alert">
                            {loginError}
                        </Alert>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit(onSubmit)} noValidate>
                        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>

                            {/* Email */}
                            <FormControl fullWidth>
                                <FormLabel htmlFor="email" className="signin-field-label">
                                    Email Address
                                </FormLabel>
                                <TextField
                                    id="email" type="email"
                                    placeholder="dr.name@clinic.com"
                                    autoComplete="email" autoFocus fullWidth
                                    error={!!errors.email}
                                    helperText={errors.email?.message}
                                    {...register('email')}
                                />
                            </FormControl>

                            {/* Password */}
                            <FormControl fullWidth>
                                <div className="signin-password-label-row">
                                    <FormLabel htmlFor="password" className="signin-field-label">
                                        Password
                                    </FormLabel>
                                    <Link component="button" type="button" className="signin-forgot-link">
                                        Forgot password?
                                    </Link>
                                </div>
                                <TextField
                                    id="password"
                                    type={showPass ? 'text' : 'password'}
                                    placeholder="••••••••••"
                                    autoComplete="current-password" fullWidth
                                    error={!!errors.password}
                                    helperText={errors.password?.message}
                                    InputProps={{
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    onClick={() => setShowPass(s => !s)}
                                                    edge="end" size="small"
                                                    sx={{ color: 'text.secondary' }}>
                                                    <EyeIcon open={showPass} />
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                    {...register('password')}
                                />
                            </FormControl>

                            {/* Clinic Code */}
                            <FormControl fullWidth>
                                <FormLabel htmlFor="clinicCode" className="signin-field-label">
                                    Clinic Code
                                </FormLabel>
                                <TextField
                                    id="clinicCode" type="text" fullWidth
                                    placeholder="e.g. C-001"
                                    error={!!errors.clinicCode}
                                    helperText={errors.clinicCode?.message ?? 'Provided by your clinic administrator'}
                                    inputProps={{ style: { textTransform: 'uppercase' } }}
                                    {...register('clinicCode')}
                                />
                            </FormControl>

                            {/* Submit */}
                            <Button
                                type="submit" fullWidth variant="contained"
                                disabled={loading}
                                className="signin-submit-btn">
                                {loading
                                    ? <span className="signin-spinner">
                                        <span className="signin-spinner-dot" />
                                        Authenticating…
                                      </span>
                                    : 'Sign In →'
                                }
                            </Button>

                            {/* Divider */}
                            <div className="signin-divider">
                                <div className="signin-divider-line" />
                                <Typography className="signin-divider-text">or</Typography>
                                <div className="signin-divider-line" />
                            </div>

                            {/* SSO */}
                            <Button variant="outlined" fullWidth className="signin-sso-btn">
                                <span className="signin-sso-content">
                                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                                        stroke="currentColor" strokeWidth="2"
                                        strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
                                        <polyline points="9 22 9 12 15 12 15 22" />
                                    </svg>
                                    Sign in with Institution SSO
                                </span>
                            </Button>

                        </Box>
                    </form>

                    {/* Footer */}
                    <Typography className="signin-footer">
                        Protected by enterprise-grade encryption.<br />
                        By signing in you agree to our{' '}
                        <Link href="#" className="signin-footer-link">Terms of Service</Link>
                        {' '}and{' '}
                        <Link href="#" className="signin-footer-link">Privacy Policy</Link>.
                    </Typography>
                </div>
            </div>
        </div>
    );
}

export default SignIn;