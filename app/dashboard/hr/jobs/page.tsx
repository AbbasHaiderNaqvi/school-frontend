'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { employeeService } from '@/lib/services/hr'
import { useUser } from '@/lib/hooks/use-user'
import { Plus, Search, Briefcase } from 'lucide-react'
import type { JobOpening } from '@/lib/types'

export default function JobOpeningsPage() {
  const { user } = useUser()
  const [jobs, setJobs] = useState<JobOpening[]>([])
  const [filteredJobs, setFilteredJobs] = useState<JobOpening[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [addDialog, setAddDialog] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    department: '',
    jobType: 'full_time' as 'full_time' | 'part_time' | 'contract',
    location: '',
    salary: '',
    description: '',
    requirements: '',
    responsibilities: '',
    applicationDeadline: '',
  })

  useEffect(() => {
    loadJobs()
  }, [user])

  useEffect(() => {
    filterJobs()
  }, [jobs, searchTerm, statusFilter])

  const loadJobs = async () => {
    if (!user?.tenantId) return

    try {
      setLoading(true)
      const data = await employeeService.getJobOpenings(user.tenantId)
      setJobs(data)
    } catch (error) {
      console.error('[v0] Error loading jobs:', error)
    } finally {
      setLoading(false)
    }
  }

  const filterJobs = () => {
    let filtered = [...jobs]

    if (searchTerm) {
      filtered = filtered.filter(job =>
        job.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        job.department.toLowerCase().includes(searchTerm.toLowerCase())
      )
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(job => job.status === statusFilter)
    }

    setFilteredJobs(filtered)
  }

  const handleAddJob = async () => {
    if (!user?.tenantId || !formData.title) return

    try {
      await employeeService.createJobOpening({
        ...formData,
        tenantId: user.tenantId,
        postedBy: user.id,
        postedByName: user.name,
        status: 'open',
        applicants: 0,
      })
      setAddDialog(false)
      setFormData({
        title: '',
        department: '',
        jobType: 'full_time',
        location: '',
        salary: '',
        description: '',
        requirements: '',
        responsibilities: '',
        applicationDeadline: '',
      })
      loadJobs()
    } catch (error) {
      console.error('[v0] Error adding job:', error)
    }
  }

  const handleUpdateStatus = async (jobId: string, newStatus: 'open' | 'closed' | 'filled') => {
    try {
      await employeeService.updateJobOpening(jobId, { status: newStatus })
      loadJobs()
    } catch (error) {
      console.error('[v0] Error updating job status:', error)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'open':
        return <Badge className="bg-green-100 text-green-800">Open</Badge>
      case 'closed':
        return <Badge variant="secondary">Closed</Badge>
      case 'filled':
        return <Badge className="bg-blue-100 text-blue-800">Filled</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  const getJobTypeBadge = (type: string) => {
    switch (type) {
      case 'full_time':
        return <Badge variant="default">Full-time</Badge>
      case 'part_time':
        return <Badge variant="secondary">Part-time</Badge>
      case 'contract':
        return <Badge variant="outline">Contract</Badge>
      default:
        return <Badge>{type}</Badge>
    }
  }

  if (loading) {
    return <div className="p-8">Loading job openings...</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Job Openings</h1>
          <p className="text-muted-foreground">Manage recruitment and open positions</p>
        </div>
        <Button onClick={() => setAddDialog(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Post Job
        </Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex-1 max-w-sm">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search jobs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="open">Open</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="filled">Filled</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Salary</TableHead>
                <TableHead>Applicants</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Deadline</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredJobs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    No job openings found
                  </TableCell>
                </TableRow>
              ) : (
                filteredJobs.map((job) => (
                  <TableRow key={job.id}>
                    <TableCell className="font-medium">{job.title}</TableCell>
                    <TableCell>{job.department}</TableCell>
                    <TableCell>{getJobTypeBadge(job.jobType)}</TableCell>
                    <TableCell>{job.salary}</TableCell>
                    <TableCell>{job.applicants}</TableCell>
                    <TableCell>{getStatusBadge(job.status)}</TableCell>
                    <TableCell>{job.applicationDeadline}</TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        {job.status === 'open' && (
                          <>
                            <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(job.id, 'closed')}>
                              Close
                            </Button>
                            <Button size="sm" variant="default" onClick={() => handleUpdateStatus(job.id, 'filled')}>
                              Mark Filled
                            </Button>
                          </>
                        )}
                        {job.status === 'closed' && (
                          <Button size="sm" variant="outline" onClick={() => handleUpdateStatus(job.id, 'open')}>
                            Reopen
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={addDialog} onOpenChange={setAddDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Post New Job Opening</DialogTitle>
            <DialogDescription>Create a new job posting for recruitment</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="title">Job Title *</Label>
                <Input
                  id="title"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g., Mathematics Teacher"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="department">Department</Label>
                <Input
                  id="department"
                  value={formData.department}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="e.g., Academic"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="jobType">Job Type</Label>
                <Select value={formData.jobType} onValueChange={(value: any) => setFormData({ ...formData, jobType: value })}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="full_time">Full-time</SelectItem>
                    <SelectItem value="part_time">Part-time</SelectItem>
                    <SelectItem value="contract">Contract</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input
                  id="location"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="e.g., Main Campus"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="salary">Salary Range</Label>
                <Input
                  id="salary"
                  value={formData.salary}
                  onChange={(e) => setFormData({ ...formData, salary: e.target.value })}
                  placeholder="e.g., $50,000 - $70,000"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicationDeadline">Application Deadline</Label>
                <Input
                  id="applicationDeadline"
                  type="date"
                  value={formData.applicationDeadline}
                  onChange={(e) => setFormData({ ...formData, applicationDeadline: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Job Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Describe the job role..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="requirements">Requirements</Label>
              <Textarea
                id="requirements"
                value={formData.requirements}
                onChange={(e) => setFormData({ ...formData, requirements: e.target.value })}
                placeholder="List required qualifications..."
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="responsibilities">Responsibilities</Label>
              <Textarea
                id="responsibilities"
                value={formData.responsibilities}
                onChange={(e) => setFormData({ ...formData, responsibilities: e.target.value })}
                placeholder="List key responsibilities..."
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddDialog(false)}>Cancel</Button>
            <Button onClick={handleAddJob}>Post Job</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
