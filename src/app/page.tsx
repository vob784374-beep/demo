import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Header } from "@/components/layout/Header"

export default function Home() {
  return (
    <div className="min-h-screen bg-background/50 page-content">
      <Header user={null} />

      {/* Hero */}
      <section className="py-20 px-4">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold text-foreground mb-4 animate-fade-in-up">Learn English Online</h1>
          <p className="text-lg text-muted-foreground mb-8 animate-fade-in-up delay-100">Access courses from expert instructors. Track your progress and earn certificates.</p>
          <div className="flex gap-3 justify-center animate-fade-in-up delay-200">
            <Link href="/student/courses">
              <Button size="lg" className="shadow-lg hover-lift btn-animate">Browse Courses</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Courses Preview */}
      <section className="py-16 px-4 bg-card border-t border-border">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-foreground">Popular courses</h2>
            <Link href="/student/courses">
              <Button variant="outline" size="sm" className="hover-lift">View all</Button>
            </Link>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="border border-border rounded-lg overflow-hidden hover:shadow-lg hover:border-primary/30 transition-all duration-200 group cursor-pointer hover-lift">
                <div className="bg-muted aspect-video" />
                <div className="p-4">
                  <h3 className="font-medium text-foreground mb-1 group-hover:text-primary transition-colors">Course {i}</h3>
                  <p className="text-sm text-muted-foreground">Instructor Name</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-4 bg-muted/30">
        <div className="max-w-6xl mx-auto">
          <div className="grid gap-8 md:grid-cols-3">
            {[
              { title: "Expert Instructors", desc: "Learn from industry experts with real-world experience." },
              { title: "Flexible Learning", desc: "Study at your own pace, anytime, anywhere." },
              { title: "Certificates", desc: "Earn recognized certificates to showcase your skills." },
            ].map((feature, i) => (
              <div key={i} className="text-center p-6">
                <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="h-6 w-6">
                    <path d="M12 2v20M2 12h20" />
                  </svg>
                </div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-border py-8 bg-card">
        <div className="max-w-6xl mx-auto px-4 text-center text-sm text-muted-foreground">
          <p className="font-medium text-foreground mb-2">LMS Platform</p>
          <p>&copy; {new Date().getFullYear()} Learning Management System. All rights reserved.</p>
        </div>
      </footer>
    </div>
  )
}
