import { useState, type FormEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Modal } from '../../../components/ui/Modal';
import { Input } from '../../../components/ui/Input';
import { Button } from '../../../components/ui/Button';
import { createThread } from '../../../api/messages';

interface ComposeMessageProps {
  open: boolean;
  onClose: () => void;
  onSent: () => void;
}

export function ComposeMessage({ open, onClose, onSent }: ComposeMessageProps) {
  const { t } = useTranslation();
  const [recipientSearch, setRecipientSearch] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSend = async (e: FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !body.trim()) return;
    setSending(true);
    setError(null);
    try {
      // For now, participant_ids is empty since we don't have user search yet
      await createThread({ participant_ids: [], subject, body });
      setSubject('');
      setBody('');
      setRecipientSearch('');
      onSent();
      onClose();
    } catch {
      setError(t('sendError', 'Could not send message.'));
    }
    setSending(false);
  };

  return (
    <Modal open={open} onClose={onClose} title={t('newMessage', 'New message')}>
      <form onSubmit={handleSend} className="user-form">
        {error && <div className="form-alert form-alert--error">{error}</div>}
        <Input
          id="recipient"
          label={t('to', 'To')}
          value={recipientSearch}
          onChange={(e) => setRecipientSearch(e.currentTarget.value)}
          placeholder={t('searchRecipient', 'Search for a user...')}
        />
        <Input
          id="msgSubject"
          label={t('subject', 'Subject')}
          value={subject}
          onChange={(e) => setSubject(e.currentTarget.value)}
          required
        />
        <div className="form-group">
          <label>{t('messageBody', 'Message')}</label>
          <textarea
            className="compose-textarea"
            rows={5}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            required
          />
        </div>
        <div className="form-actions">
          <Button type="button" variant="secondary" onClick={onClose}>{t('cancel')}</Button>
          <Button type="submit" variant="primary" loading={sending}>{t('send', 'Send')}</Button>
        </div>
      </form>
    </Modal>
  );
}
