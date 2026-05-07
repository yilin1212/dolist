import TaskList from '../components/TaskList'
import { useTranslation } from '../../../i18n'

export default function InboxPage() {
  const { t } = useTranslation()
  return <TaskList title={t('nav.inbox')} subtitle={t('common.subtitleInbox')} listFilter="inbox" />
}
