import { motion } from "framer-motion";
import { Link } from "wouter";
import { Beaker, Scan, Brain, Activity, ArrowRight, Sparkles } from "lucide-react";

export default function LandingPage() {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.2, delayChildren: 0.1 }
    }
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { type: "spring", stiffness: 100, damping: 20 }
    }
  };

  const floatingVariants = {
    animate: {
      y: [0, -15, 0],
      transition: {
        duration: 4,
        repeat: Infinity,
        ease: "easeInOut"
      }
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 relative overflow-hidden flex flex-col font-sans selection:bg-primary/30">

      {/* Background Orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div
          animate={{ scale: [1, 1.2, 1], opacity: [0.1, 0.15, 0.1] }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-[20%] -left-[10%] w-[70vw] h-[70vw] rounded-full bg-primary blur-[120px]"
        />
        <motion.div
          animate={{ scale: [1, 1.5, 1], opacity: [0.05, 0.1, 0.05] }}
          transition={{ duration: 12, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-[40%] -right-[20%] w-[60vw] h-[80vw] rounded-full bg-sky-500 blur-[150px]"
        />
      </div>

      {/* Navbar */}
      <header className="w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between z-10 relative">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-primary to-sky-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(var(--primary),0.4)]">
            <Beaker className="w-5 h-5 text-white" />
          </div>
          <h1 className="text-xl font-bold tracking-tight">Snap to Know</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/login" className="text-sm font-medium text-slate-300 hover:text-white transition-colors">
            Sign In
          </Link>
          <Link href="/signup" className="text-sm font-medium bg-white text-slate-950 px-5 py-2.5 rounded-full hover:bg-slate-200 transition-colors shadow-[0_0_15px_rgba(255,255,255,0.2)]">
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-4 sm:px-6 py-12 md:py-24 flex flex-col items-center justify-center z-10 relative text-center">

        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="w-full flex flex-col items-center"
        >
          <motion.div variants={itemVariants} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900/80 border border-slate-800 text-sm font-medium text-slate-300 mb-8 backdrop-blur-sm shadow-xl relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-primary/10 to-sky-500/10 opacity-50" />
            <Sparkles className="w-4 h-4 text-primary relative z-10" />
            <span className="relative z-10">Meet your new AI Dietitian</span>
          </motion.div>

          <motion.h1 variants={itemVariants} className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 leading-[1.1] max-w-4xl text-balance">
            Track your nutrition at the <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary via-blue-400 to-sky-300">
              speed of a photo.
            </span>
          </motion.h1>

          <motion.p variants={itemVariants} className="text-lg md:text-xl text-slate-400 max-w-2xl text-balance mb-12">
            Upload pictures of your meals or scan barcodes. Our Deep Learning vision model identifies the food and breaks down your macros instantly.
          </motion.p>

          <motion.div variants={itemVariants} className="flex flex-col sm:flex-row gap-4 mb-24">
            <Link href="/signup" className="group relative inline-flex items-center justify-center gap-2 bg-primary text-primary-foreground px-8 py-4 rounded-full text-base font-semibold transition-all hover:bg-primary/90 hover:scale-105 shadow-[0_0_30px_rgba(var(--primary),0.3)]">
              Start Tracking Free
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link href="/login" className="inline-flex items-center justify-center gap-2 bg-slate-900 border border-slate-800 text-slate-300 px-8 py-4 rounded-full text-base font-semibold hover:bg-slate-800 hover:text-white transition-all hover:scale-105">
              Sign In to Account
            </Link>
          </motion.div>

          {/* Feature Grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-6">

            <motion.div variants={itemVariants} whileHover={{ y: -8, transition: { duration: 0.2 } }}>
              <div className="h-full bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6">
                  <Brain className="w-6 h-6 text-primary" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Visual AI Model</h3>
                <p className="text-slate-400 text-sm leading-relaxed text-balance">
                  Utilizes MobileNetV2 architecture trained on dynamic culinary datasets to recognize distinct food items instantly.
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} whileHover={{ y: -8, transition: { duration: 0.2 } }}>
              <div className="h-full bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-sky-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6">
                  <Scan className="w-6 h-6 text-sky-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Universal Barcode</h3>
                <p className="text-slate-400 text-sm leading-relaxed text-balance">
                  Automatically pulls accurate nutritional tags using global databases for instant logging of packaged goods.
                </p>
              </div>
            </motion.div>

            <motion.div variants={itemVariants} whileHover={{ y: -8, transition: { duration: 0.2 } }}>
              <div className="h-full bg-slate-900/50 border border-slate-800/80 rounded-3xl p-8 backdrop-blur-xl relative overflow-hidden group">
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className="w-12 h-12 bg-slate-800/80 rounded-2xl flex items-center justify-center mb-6">
                  <Activity className="w-6 h-6 text-indigo-400" />
                </div>
                <h3 className="text-xl font-bold mb-3 text-white">Smart Goals</h3>
                <p className="text-slate-400 text-sm leading-relaxed text-balance">
                  Calculates BMR and sets rigid dietary macro targets based on your goals with an A-F granular scoring system.
                </p>
              </div>
            </motion.div>

          </div>
        </motion.div>

      </main>
    </div>
  );
}
