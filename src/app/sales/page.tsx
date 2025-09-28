import React, { Suspense } from 'react';
import { SalesLoading } from './components';
import SalesPageContent from './SalesPageContent';

export default function SalesPage() {
  return (
    <Suspense fallback={<SalesLoading />}>
      <SalesPageContent />
    </Suspense>
  );
}