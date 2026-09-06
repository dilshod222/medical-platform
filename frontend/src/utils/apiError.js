export function getApiErrorMessage(error) {
  const data = error.response?.data;

  if (!data) {
    return 'Server bilan bog‘lanib bo‘lmadi.';
  }

  if (typeof data === 'string') {
    if (
      data.trimStart().startsWith('<!DOCTYPE')
      || data.trimStart().startsWith('<html')
    ) {
      return 'Serverda ichki xatolik yuz berdi. Backend terminalini tekshiring.';
    }

    return data;
  }

  if (data.detail) {
    return data.detail;
  }

  const messages = [];

  Object.entries(data).forEach(([field, value]) => {
    if (Array.isArray(value)) {
      messages.push(`${field}: ${value.join(' ')}`);
    } else if (typeof value === 'string') {
      messages.push(`${field}: ${value}`);
    }
  });

  if (messages.length > 0) {
    return messages.join('\n');
  }

  return 'Xatolik yuz berdi.';
}
