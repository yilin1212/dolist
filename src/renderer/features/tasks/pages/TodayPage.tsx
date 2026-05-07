import TaskList from '../components/TaskList'
import { useTranslation } from '../../../i18n'

export default function TodayPage() {
  const { t } = useTranslation()
  return <TaskList title={t('nav.today')} subtitle={t('common.subtitleToday')} listFilter="today" />
}
