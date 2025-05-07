"use client";

import React, { useState, useEffect } from 'react';
import { Table, TableHeader, TableRow, TableCell, TableBody } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

export default function AdminReportsPage() {
  const [reports, setReports] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const { toast } = useToast();

  const fetchReports = async (page = 1) => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/reports?page=${page}`);
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', errorText);
        throw new Error('Failed to fetch data from /api/reports');
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid JSON response');
      }
      const data = await response.json();
      setReports(data.reports);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Error fetching reports:', error);
      toast({ title: 'Error', description: 'Failed to fetch reports. Please try again later.', variant: 'destructive' });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReports(currentPage);
  }, [currentPage]);

  const handleAction = async (id, action) => {
    try {
      const response = await fetch(`/api/reports/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('API error:', errorText);
        throw new Error(`Failed to update report with ID ${id}`);
      }
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Invalid JSON response');
      }
      toast({ title: 'Success', description: `Report marked as ${action}.` });
      setReports(reports.filter(report => report.id !== id));
    } catch (error) {
      console.error('Error updating report:', error);
      toast({ title: 'Error', description: 'Failed to update report. Please try again later.', variant: 'destructive' });
    }
  };

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Manage Reports</h1>
      <Card>
        <CardHeader>
          <CardTitle>Submitted Reports</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p>Loading...</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableCell>Report ID</TableCell>
                  <TableCell>Property ID</TableCell>
                  <TableCell>User ID</TableCell>
                  <TableCell>Owner ID</TableCell>
                  <TableCell>Reason</TableCell>
                  <TableCell>Timestamp</TableCell>
                  <TableCell>Actions</TableCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map(report => {
                  if (!report) {
                    console.error('Error: Report is null or undefined');
                    return null;
                  }

                  return (
                    <TableRow key={report.id}>
                      <TableCell>{report.id}</TableCell>
                      <TableCell>{report.property_id}</TableCell>
                      <TableCell>{report.user_id}</TableCell>
                      <TableCell>{report.owner_id}</TableCell>
                      <TableCell>{report.reason}</TableCell>
                      <TableCell>{new Date(report.timestamp).toLocaleString()}</TableCell>
                      <TableCell>
                        <Button onClick={() => handleAction(report.id, 'reviewed')} variant="outline" size="sm">Mark as Reviewed</Button>
                        <Button onClick={() => handleAction(report.id, 'delete')} variant="destructive" size="sm">Delete</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
          <div className="flex justify-between mt-4">
            <Button
              onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 1))}
              disabled={currentPage === 1}
            >
              Previous
            </Button>
            <span>Page {currentPage} of {totalPages}</span>
            <Button
              onClick={() => setCurrentPage((prev) => Math.min(prev + 1, totalPages))}
              disabled={currentPage === totalPages}
            >
              Next
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}