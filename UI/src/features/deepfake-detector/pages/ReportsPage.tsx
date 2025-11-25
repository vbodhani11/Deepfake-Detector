import React from 'react';
import ParticlesBackground from '../components/ParticlesBackground';

const reports = [
  { id: 'rpt-001', title: 'Upload Session #1', status: 'Completed', confidence: '92%' },
  { id: 'rpt-002', title: 'Upload Session #2', status: 'In Progress', confidence: '-' },
  { id: 'rpt-003', title: 'Upload Session #3', status: 'Completed', confidence: '87%' },
];

const ReportsPage: React.FC = () => {
  return (
    <div className='min-h-screen bg-black text-gray-300 relative overflow-x-hidden'>
      <ParticlesBackground />

      <div className='relative z-10 max-w-4xl mx-auto px-4 py-16'>
        <div className='mb-10 text-center'>
          <h1 className='text-4xl font-bold text-blue-400 uppercase tracking-wide mb-2'>
            Saved Reports
          </h1>
          <p className='text-gray-400'>Access your previously generated deepfake analyses.</p>
        </div>

        <div className='space-y-4'>
          {reports.map((report) => (
            <div
              key={report.id}
              className='bg-gray-900/60 backdrop-blur rounded-xl p-6 border border-gray-800 hover:border-blue-500 transition-colors'
            >
              <div className='flex flex-col md:flex-row md:items-center md:justify-between gap-4'>
                <div>
                  <p className='text-sm text-gray-500 uppercase tracking-wide'>Report ID</p>
                  <p className='text-xl font-semibold text-white'>{report.id}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500 uppercase tracking-wide'>Title</p>
                  <p className='text-lg'>{report.title}</p>
                </div>
                <div>
                  <p className='text-sm text-gray-500 uppercase tracking-wide'>Status</p>
                  <span className='text-blue-300 font-semibold'>{report.status}</span>
                </div>
                <div>
                  <p className='text-sm text-gray-500 uppercase tracking-wide'>Confidence</p>
                  <span className='text-yellow-300 font-semibold'>{report.confidence}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ReportsPage;

