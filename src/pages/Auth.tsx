import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Phone, User, Loader2, ArrowLeft, KeyRound } from 'lucide-react';
import { InputOTP, InputOTPGroup, InputOTPSlot } from '@/components/ui/input-otp';

type AuthStep = 'phone' | 'otp';

const Auth: React.FC = () => {
  const navigate = useNavigate();
  const { user, sendOTP, verifyOTP } = useAuth();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState<AuthStep>('phone');
  
  const [phone, setPhone] = useState('');
  const [fullName, setFullName] = useState('');
  const [otp, setOtp] = useState('');
  const [isNewUser, setIsNewUser] = useState(false);

  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);

  const validatePhone = (phone: string) => {
    const phoneRegex = /^\+?[1-9]\d{9,14}$/;
    return phoneRegex.test(phone.replace(/\s/g, ''));
  };

  const handleSendOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validatePhone(phone)) {
      toast.error('Please enter a valid phone number with country code (e.g., +919876543210)');
      return;
    }

    setLoading(true);
    const { error } = await sendOTP(phone);
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to send OTP');
    } else {
      toast.success('OTP sent to your phone!');
      setStep('otp');
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();

    if (otp.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    if (isNewUser && !fullName.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    const { error, isNewUser: newUser } = await verifyOTP(phone, otp, fullName.trim() || undefined);
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Invalid OTP');
    } else {
      if (newUser) {
        toast.success('Welcome! Please complete your profile.');
        navigate('/profile-setup');
      } else {
        toast.success('Welcome back!');
        navigate('/');
      }
    }
  };

  const handleBack = () => {
    setStep('phone');
    setOtp('');
  };

  const handleResendOTP = async () => {
    setLoading(true);
    const { error } = await sendOTP(phone);
    setLoading(false);

    if (error) {
      toast.error(error.message || 'Failed to resend OTP');
    } else {
      toast.success('OTP resent successfully!');
      setOtp('');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-secondary/30 to-background p-4">
      <div className="w-full max-w-md animate-fade-in">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex h-16 w-16 items-center justify-center rounded-full bg-primary mb-4">
            <span className="font-display text-2xl font-bold text-primary-foreground">CS</span>
          </div>
          <h1 className="font-display text-3xl font-bold text-primary">CricScore</h1>
          <p className="text-muted-foreground mt-2">Score Every Moment</p>
        </div>

        <Card className="border-2">
          <CardHeader className="text-center">
            <CardTitle className="font-display text-xl">
              {step === 'phone' ? 'Welcome' : 'Verify OTP'}
            </CardTitle>
            <CardDescription>
              {step === 'phone' 
                ? 'Enter your phone number to continue' 
                : `Enter the 6-digit code sent to ${phone}`}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {step === 'phone' ? (
              <form onSubmit={handleSendOTP} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone Number</Label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      id="phone"
                      type="tel"
                      placeholder="+919876543210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="pl-10"
                      required
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Include country code (e.g., +91 for India)
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="newUser"
                    checked={isNewUser}
                    onChange={(e) => setIsNewUser(e.target.checked)}
                    className="rounded border-border"
                  />
                  <Label htmlFor="newUser" className="text-sm font-normal cursor-pointer">
                    I'm a new user
                  </Label>
                </div>

                {isNewUser && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="fullName">Full Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullName"
                        type="text"
                        placeholder="Virat Kohli"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required={isNewUser}
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending OTP...
                    </>
                  ) : (
                    <>
                      <KeyRound className="mr-2 h-4 w-4" />
                      Get OTP
                    </>
                  )}
                </Button>
              </form>
            ) : (
              <form onSubmit={handleVerifyOTP} className="space-y-6">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={handleBack}
                  className="mb-2 -ml-2"
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Change Number
                </Button>

                <div className="flex flex-col items-center gap-4">
                  <Label>Enter OTP</Label>
                  <InputOTP 
                    maxLength={6} 
                    value={otp} 
                    onChange={(value) => setOtp(value)}
                  >
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>

                {isNewUser && (
                  <div className="space-y-2">
                    <Label htmlFor="fullNameOtp">Your Name</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="fullNameOtp"
                        type="text"
                        placeholder="Virat Kohli"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                )}

                <Button type="submit" className="w-full" size="lg" disabled={loading || otp.length !== 6}>
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Verifying...
                    </>
                  ) : (
                    'Verify & Continue'
                  )}
                </Button>

                <div className="text-center">
                  <Button
                    type="button"
                    variant="link"
                    size="sm"
                    onClick={handleResendOTP}
                    disabled={loading}
                    className="text-muted-foreground"
                  >
                    Didn't receive OTP? Resend
                  </Button>
                </div>
              </form>
            )}
          </CardContent>
        </Card>

        <p className="text-center text-sm text-muted-foreground mt-6">
          By continuing, you agree to our Terms of Service and Privacy Policy
        </p>
      </div>
    </div>
  );
};

export default Auth;
