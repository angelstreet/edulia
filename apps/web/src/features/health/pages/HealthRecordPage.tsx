import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { Spinner } from '../../../components/ui/Spinner';
import client from '../../../api/client';
import { getHealthRecord, updateHealthRecord, type HealthRecordData } from '../../../api/health';

interface StudentUser {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  display_name: string | null;
}

const BLOOD_TYPES = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'Unknown'];

const EMPTY_RECORD: HealthRecordData = {
  allergies: '',
  medical_conditions: '',
  medications: '',
  doctor_name: '',
  doctor_phone: '',
  emergency_contact_name: '',
  emergency_contact_phone: '',
  emergency_contact_relation: '',
  blood_type: '',
  notes: '',
};

export function HealthRecordPage() {
  const { t } = useTranslation();
  const [students, setStudents] = useState<StudentUser[]>([]);
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<StudentUser | null>(null);
  const [record, setRecord] = useState<HealthRecordData>(EMPTY_RECORD);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [loadingRecord, setLoadingRecord] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    setLoadingStudents(true);
    client
      .get<StudentUser[]>('/v1/users', { params: { role: 'student' } })
      .then(({ data }) => setStudents(data))
      .catch(() => setStudents([]))
      .finally(() => setLoadingStudents(false));
  }, []);

  async function handleSelectStudent(student: StudentUser) {
    setSelectedStudent(student);
    setSearch(student.display_name || `${student.first_name} ${student.last_name}`);
    setSaved(false);
    setLoadingRecord(true);
    try {
      const { data } = await getHealthRecord(student.id);
      setRecord({
        allergies: data.allergies ?? '',
        medical_conditions: data.medical_conditions ?? '',
        medications: data.medications ?? '',
        doctor_name: data.doctor_name ?? '',
        doctor_phone: data.doctor_phone ?? '',
        emergency_contact_name: data.emergency_contact_name ?? '',
        emergency_contact_phone: data.emergency_contact_phone ?? '',
        emergency_contact_relation: data.emergency_contact_relation ?? '',
        blood_type: data.blood_type ?? '',
        notes: data.notes ?? '',
      });
    } catch {
      setRecord(EMPTY_RECORD);
    } finally {
      setLoadingRecord(false);
    }
  }

  function field(key: keyof HealthRecordData): string {
    return (record[key] as string) ?? '';
  }

  function setField(key: keyof HealthRecordData, value: string) {
    setRecord((prev) => ({ ...prev, [key]: value }));
    setSaved(false);
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedStudent) return;
    setSaving(true);
    try {
      await updateHealthRecord(selectedStudent.id, record);
      setSaved(true);
    } catch {
      // error handled silently
    } finally {
      setSaving(false);
    }
  }

  const filteredStudents = search
    ? students.filter((s) => {
        const name = (s.display_name || `${s.first_name} ${s.last_name}`).toLowerCase();
        return name.includes(search.toLowerCase()) || s.email.toLowerCase().includes(search.toLowerCase());
      })
    : students;

  const showDropdown = search.length > 0 && !selectedStudent && filteredStudents.length > 0;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold">{t('healthRecords', 'Health Records')}</h1>
      </div>

      {/* Student search */}
      <div className="relative mb-6 max-w-md">
        <label className="text-sm font-medium block mb-1">{t('search', 'Search student')}</label>
        <input
          type="search"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
          placeholder={t('search', 'Search') + '...'}
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            if (selectedStudent) setSelectedStudent(null);
          }}
        />
        {loadingStudents && (
          <div className="absolute right-3 top-8">
            <Spinner />
          </div>
        )}
        {showDropdown && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-white shadow-lg max-h-60 overflow-y-auto">
            {filteredStudents.slice(0, 20).map((s) => (
              <button
                key={s.id}
                type="button"
                className="w-full text-left px-3 py-2 text-sm hover:bg-muted"
                onClick={() => handleSelectStudent(s)}
              >
                <span className="font-medium">{s.display_name || `${s.first_name} ${s.last_name}`}</span>
                <span className="text-muted-foreground ml-2">{s.email}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedStudent && (
        <>
          {loadingRecord ? (
            <div className="flex justify-center py-12">
              <Spinner />
            </div>
          ) : (
            <form onSubmit={handleSave} className="space-y-6 max-w-2xl">
              <div className="text-sm text-muted-foreground mb-2">
                {t('student', 'Student')}: <span className="font-semibold text-foreground">{selectedStudent.display_name || `${selectedStudent.first_name} ${selectedStudent.last_name}`}</span>
              </div>

              {/* Medical info */}
              <div className="space-y-4">
                <h2 className="text-base font-semibold border-b pb-1">{t('medicalInfo', 'Medical Information')}</h2>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">{t('allergies', 'Allergies')}</label>
                  <textarea
                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring min-h-[72px] resize-none"
                    value={field('allergies')}
                    onChange={(e) => setField('allergies', e.target.value)}
                    placeholder={t('optional', 'optional')}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">{t('medicalConditions', 'Medical Conditions')}</label>
                  <textarea
                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring min-h-[72px] resize-none"
                    value={field('medical_conditions')}
                    onChange={(e) => setField('medical_conditions', e.target.value)}
                    placeholder={t('optional', 'optional')}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">{t('medications', 'Medications')}</label>
                  <textarea
                    className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring min-h-[72px] resize-none"
                    value={field('medications')}
                    onChange={(e) => setField('medications', e.target.value)}
                    placeholder={t('optional', 'optional')}
                  />
                </div>

                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">{t('bloodType', 'Blood Type')}</label>
                  <select
                    className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none"
                    value={field('blood_type')}
                    onChange={(e) => setField('blood_type', e.target.value)}
                  >
                    <option value="">{t('select', 'Select...')}</option>
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Doctor info */}
              <div className="space-y-4">
                <h2 className="text-base font-semibold border-b pb-1">{t('doctorInfo', 'Doctor Information')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">{t('doctorName', 'Doctor Name')}</label>
                    <input
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                      value={field('doctor_name')}
                      onChange={(e) => setField('doctor_name', e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">{t('doctorPhone', 'Doctor Phone')}</label>
                    <input
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                      value={field('doctor_phone')}
                      onChange={(e) => setField('doctor_phone', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* Emergency contact */}
              <div className="space-y-4">
                <h2 className="text-base font-semibold border-b pb-1">{t('emergencyContact', 'Emergency Contact')}</h2>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">{t('name', 'Name')}</label>
                    <input
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                      value={field('emergency_contact_name')}
                      onChange={(e) => setField('emergency_contact_name', e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1">
                    <label className="text-sm font-medium">{t('phone', 'Phone')}</label>
                    <input
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                      value={field('emergency_contact_phone')}
                      onChange={(e) => setField('emergency_contact_phone', e.target.value)}
                    />
                  </div>
                  <div className="flex flex-col gap-1 col-span-2">
                    <label className="text-sm font-medium">{t('relation', 'Relation')}</label>
                    <input
                      className="h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring"
                      value={field('emergency_contact_relation')}
                      onChange={(e) => setField('emergency_contact_relation', e.target.value)}
                      placeholder={t('eg', 'e.g. Mother, Father...')}
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium">{t('notes', 'Notes')}</label>
                <textarea
                  className="rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-xs outline-none focus-visible:border-ring min-h-[80px] resize-none"
                  value={field('notes')}
                  onChange={(e) => setField('notes', e.target.value)}
                  placeholder={t('optional', 'optional')}
                />
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" variant="primary" disabled={saving}>
                  {saving ? t('saving', 'Saving...') : t('save', 'Save')}
                </Button>
                {saved && <span className="text-sm text-green-600">{t('saved', 'Saved!')}</span>}
              </div>
            </form>
          )}
        </>
      )}
    </div>
  );
}
