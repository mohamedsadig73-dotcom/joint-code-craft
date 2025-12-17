import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { 
  FileText, 
  Shield, 
  Clock, 
  BarChart3, 
  CheckCircle, 
  Users,
  ArrowRight,
  Zap,
  Globe
} from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
  const features = [
    {
      icon: FileText,
      title: 'Declaration Management',
      description: 'Track and manage all your declarations in one centralized platform with real-time status updates.'
    },
    {
      icon: Shield,
      title: 'Secure & Compliant',
      description: 'Enterprise-grade security with role-based access control and complete audit trails.'
    },
    {
      icon: Clock,
      title: 'Real-time Tracking',
      description: 'Monitor declaration status changes instantly with automated notifications.'
    },
    {
      icon: BarChart3,
      title: 'Advanced Analytics',
      description: 'Comprehensive reports and insights to optimize your workflow efficiency.'
    },
    {
      icon: Users,
      title: 'Team Collaboration',
      description: 'Multi-user support with customizable permissions for seamless teamwork.'
    },
    {
      icon: Zap,
      title: 'Maintenance System',
      description: 'Built-in maintenance scheduling and tracking for assets and equipment.'
    }
  ];

  const stats = [
    { value: '99.9%', label: 'Uptime' },
    { value: '50K+', label: 'Declarations Processed' },
    { value: '500+', label: 'Active Users' },
    { value: '24/7', label: 'Support' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-[hsl(210,100%,20%)] via-[hsl(220,26%,28%)] to-[hsl(217,33%,37%)]">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/10 backdrop-blur-lg border-b border-border/20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-2">
              <FileText className="w-8 h-8 text-secondary" />
              <span className="text-xl font-bold text-foreground">DTS</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-foreground/80 hover:text-foreground transition link-animated">Features</a>
              <a href="#stats" className="text-foreground/80 hover:text-foreground transition link-animated">Stats</a>
              <a href="#contact" className="text-foreground/80 hover:text-foreground transition link-animated">Contact</a>
            </nav>
            <div className="flex items-center gap-4">
              <Link to="/login">
                <Button variant="ghost" className="text-foreground">
                  Login
                </Button>
              </Link>
              <Link to="/login">
                <Button className="bg-secondary text-secondary-foreground hover:bg-secondary/90">
                  Get Started
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section - FIX #5: Improved spacing */}
      <section className="pt-40 pb-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground mb-6">
              Declaration Tracking
              <span className="block mt-2 gradient-text">Made Simple</span>
            </h1>
            <p className="text-lg sm:text-xl text-muted-foreground max-w-3xl mx-auto mb-10">
              Transform your manual declaration workflow into an intelligent digital system 
              with real-time tracking, automated approvals, and comprehensive reporting
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link to="/login">
                <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 btn-interactive px-8 py-6 text-base">
                  Start Free Trial
                  <ArrowRight className="w-5 h-5" />
                </Button>
              </Link>
              <Button size="lg" variant="outline" className="border-border/50 text-foreground hover:bg-background/20 hover:border-secondary/50 px-8 py-6 text-base">
                Watch Demo
              </Button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Stats Section - FIX #5: Improved spacing with divider */}
      <section id="stats" className="py-20 px-4 sm:px-6 lg:px-8 relative">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 lg:gap-12">
            {stats.map((stat, index) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
                className="text-center p-6 rounded-xl hover:bg-background/5 transition-colors"
              >
                <div className="text-3xl sm:text-4xl lg:text-5xl font-bold text-secondary mb-3">
                  {stat.value}
                </div>
                <div className="text-muted-foreground font-medium">{stat.label}</div>
              </motion.div>
            ))}
          </div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
      </section>

      {/* Features Section - FIX #5: Improved spacing */}
      <section id="features" className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5">
              Everything You Need
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto text-lg">
              A complete solution for managing declarations, tracking status, and generating reports
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 lg:gap-10">
            {features.map((feature, index) => (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                viewport={{ once: true }}
              >
                <Card className="glass-card border-border/50 p-8 h-full card-interactive">
                  <div className="p-4 rounded-xl bg-secondary/10 w-fit mb-5 transition-colors group-hover:bg-secondary/20">
                    <feature.icon className="w-7 h-7 text-secondary" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-3">
                    {feature.title}
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    {feature.description}
                  </p>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section - FIX #5: Improved spacing */}
      <section className="py-28 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto text-center">
          <Card className="glass-card border-border/50 p-16 card-interactive">
            <div className="p-4 rounded-full bg-secondary/10 w-fit mx-auto mb-8">
              <Globe className="w-10 h-10 text-secondary" />
            </div>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-5">
              Ready to Get Started?
            </h2>
            <p className="text-muted-foreground mb-10 max-w-xl mx-auto text-lg">
              Join thousands of users who have streamlined their declaration workflow with our platform
            </p>
            <Link to="/login">
              <Button size="lg" className="bg-secondary text-secondary-foreground hover:bg-secondary/90 gap-2 btn-interactive px-10 py-6 text-base">
                Create Free Account
                <ArrowRight className="w-5 h-5" />
              </Button>
            </Link>
          </Card>
        </div>
      </section>

      {/* Footer */}
      <footer id="contact" className="py-12 px-4 sm:px-6 lg:px-8 border-t border-border/20">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <FileText className="w-6 h-6 text-secondary" />
              <span className="font-bold text-foreground">DTS</span>
            </div>
            <p className="text-muted-foreground text-sm">
              © {new Date().getFullYear()} Declaration Tracking System. All rights reserved.
            </p>
            <div className="flex items-center gap-6">
              <a href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                Privacy Policy
              </a>
              <a href="#" className="text-muted-foreground hover:text-foreground transition text-sm">
                Terms of Service
              </a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
