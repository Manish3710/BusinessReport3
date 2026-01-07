export const formatDateIST = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

export const formatDateOnlyIST = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleDateString('en-IN', {
      timeZone: 'Asia/Kolkata',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    });
  } catch (error) {
    console.error('Error formatting date:', error);
    return '-';
  }
};

export const formatTimeIST = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleTimeString('en-IN', {
      timeZone: 'Asia/Kolkata',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    });
  } catch (error) {
    console.error('Error formatting time:', error);
    return '-';
  }
};

export const formatDateTimeIST = (dateString: string | Date | null | undefined): string => {
  if (!dateString) return '-';

  try {
    const date = new Date(dateString);

    if (isNaN(date.getTime())) return '-';

    return date.toLocaleString('en-IN', {
      timeZone: 'Asia/Kolkata',
      dateStyle: 'medium',
      timeStyle: 'medium'
    });
  } catch (error) {
    console.error('Error formatting date time:', error);
    return '-';
  }
};

export const getCurrentISTDate = (): Date => {
  const now = new Date();
  return new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Kolkata' }));
};
