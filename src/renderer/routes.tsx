import { Navigate, Route, Routes } from 'react-router'
import { AppShell } from '@/components/layout/app-shell'
import { AchievementsPage } from '@/features/achievements/achievements-page'
import { AnalyticsPage } from '@/features/analytics/analytics-page'
import { LoginPage } from '@/features/auth/login-page'
import { RecoverPage } from '@/features/auth/recover-page'
import { RegisterPage } from '@/features/auth/register-page'
import { DashboardPage } from '@/features/dashboard/dashboard-page'
import { CatalogPage } from '@/features/exercises/catalog-page'
import { ExercisePage } from '@/features/exercises/exercise-page'
import { LearningPage } from '@/features/learning/learning-page'
import { ModulePage } from '@/features/learning/module-page'
import { PlaygroundPage } from '@/features/playground/playground-page'
import { AssessmentPage } from '@/features/practice/assessment-page'
import { PracticePage } from '@/features/practice/practice-page'
import { ProfilePage } from '@/features/profile/profile-page'

export function AppRoutes({ authenticated }: { authenticated: boolean }) {
  if (!authenticated) {
    return (
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/recover" element={<RecoverPage />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    )
  }
  return (
    <Routes>
      <Route element={<AppShell />}>
        <Route index element={<DashboardPage />} />
        <Route path="learn" element={<LearningPage />} />
        <Route path="learn/:moduleId" element={<ModulePage />} />
        <Route path="exercises" element={<CatalogPage />} />
        <Route path="exercises/:exerciseId" element={<ExercisePage />} />
        <Route path="practice" element={<PracticePage />} />
        <Route path="practice/session/:assessmentId" element={<AssessmentPage />} />
        <Route path="playground" element={<PlaygroundPage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="achievements" element={<AchievementsPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  )
}
