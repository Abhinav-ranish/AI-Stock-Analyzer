"use client";
import { useState } from "react";
import * as React from "react";
import {
  type ColumnDef,
  type ColumnFiltersState,
  type SortingState,
  type VisibilityState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import { ChevronDown, Search } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
// Add these interfaces directly to this file
interface DropdownOptions {
  value: string;
  label: string;
  disabled?: boolean;
}
interface FilterOptions {
  id: string;
  // API Query Key
  key: string;
  label: string;
  filters: DropdownOptions[];
}
import { Row } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { Skeleton } from "./skeleton";
export interface filterMapping {
  key: string;
  filters: string[];
}
export interface optionInfo {
  value: string;
  label: string;
}
interface TotalCount {
  totalElements?: number;
  totalPages?: number;
}
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  searchKey?: string;
  filters?: FilterOptions[];
  placeHolder?: boolean;
  setFilters?: (filterList: string) => void;
  setPageNum: (pageNum: number) => void;
  currentPage?: number;
  getRowClassName?: (row: Row<TData>) => string;
  onSearchChange?: (value: string) => void;
  exportable?: boolean;
  searchPlaceholder?: string;
  setSize?: (size: number) => void;
  isFetching?: boolean;
  totalCount?: TotalCount;
  exportFileName?: string;
   showSearch?: boolean;
}
export function DataTable<TData, TValue>({
  columns,
  data,
  searchKey,
  filters = [],
  setFilters,
  setPageNum,
  isFetching,
  currentPage,
  placeHolder,
  getRowClassName,
  onSearchChange,
  exportable = true,
  searchPlaceholder,
  setSize = () => { },
  totalCount,
  exportFileName = "pharma-table",
  showSearch = true
 
}: DataTableProps<TData, TValue>) {
  const dataArr: filterMapping[] = [];
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnFilters, setColumnFilters] = useState<ColumnFiltersState>([]);
  const [filtersToApply, setFiltersToApply] = useState(dataArr);
  const [searchText, setSearchText] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<
    Record<string, string>
  >({});
  const initialData = {
    pageIndex: 0,
    pageSize: 10,
  };
  const perPageArray = [10, 20, 30, 40, 50];
  const [pagination, setPagination] = useState(initialData);
  const totalElements = totalCount?.totalElements;
  const totalPages = totalCount?.totalPages;
  function hasAccessorKey<TData, TValue>(
    col: ColumnDef<TData, TValue>
  ): col is ColumnDef<TData, TValue> & { accessorKey: string } {
    return typeof (col as any).accessorKey === "string";
  }
  const initialVisibility: VisibilityState = Object.fromEntries(
    columns
      .map((col) => {
        const key =
          typeof col.id === "string"
            ? col.id
            : hasAccessorKey(col)
              ? col.accessorKey
              : undefined;

        if (!key) return null;

        return [key, col.enableHiding === true ? false : true];
      })
      .filter(Boolean) as [string, boolean][]
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialVisibility);
  const [rowSelection, setRowSelection] = React.useState({});
  const [globalFilter, setGlobalFilter] = React.useState("");
  const table = useReactTable({
    data,
    columns,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    onColumnVisibilityChange: setColumnVisibility,
    onRowSelectionChange: setRowSelection,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: "includesString",
    state: {
      sorting,
      columnFilters,
      columnVisibility,
      rowSelection,
      globalFilter,
    },
  });
  const handleTableFilters = () => {
    if (!setFilters) return;
    let newData: string = "";
    newData += filtersToApply
      .map((filterOption) =>
        filterOption ? `${filterOption.key}=${filterOption.filters}` : ""
      )
      .join("&");

    setFilters(newData);
  };
  const handleSubmitFilters = () => {
    if (onSearchChange) {
      onSearchChange("");
    }
    setPagination(initialData);
  };

  const handleTableFiltersReset = () => {
    setPagination(initialData);
    setSelectedFilters({});
    setFiltersToApply([]);
    if (onSearchChange) onSearchChange("");
    setSearchText("");
    if (setFilters) {
      setFilters("");
    }
  };

  const handleSearchChange = (value: string) => {
    if (onSearchChange) {
      setPagination(initialData);
      setSearchText(value);
      onSearchChange(value);
    }
  };
  const applyFilters = (filter: string[], k: string) => {
    if (!setFilters) return;

    setSelectedFilters((prev) => ({
      ...prev,
      [k]: filter[0] || "",
    }));
    if (filtersToApply.length <= 0 && filter.length <= 0) {
      setFilters("");
      return;
    }
    if (filter.length > 0) {
      const updatedFilters = filtersToApply.map((f) =>
        f.key === k ? { ...f, filters: filter } : f
      );
      if (!updatedFilters.find((f) => f.key === k)) {
        updatedFilters.push({ key: k, filters: filter });
      }
      setFiltersToApply(updatedFilters);
    } else {
      setFiltersToApply(filtersToApply.filter((fOption) => fOption.key !== k));
    }
  };
  const calculatePaginationDetails = () => {
    const start = pagination.pageSize * (currentPage ?? 0) + 1;
    const data = start + (pagination.pageSize - 1);
    const end = data > (totalElements ?? 0) ? (totalElements ?? 0) : data;
    return `${start}-${end} of ${totalElements || 0}`;
  };


  return (
    <div className="w-full">
      <div className="flex items-center py-4 gap-4">
        {showSearch && (
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            value={searchText}
            placeholder={searchPlaceholder ?? "Search by name..."}
            onChange={(event) => handleSearchChange(event.target.value)}
            className="pl-8"
          />
        </div>
        )}

        {filters.map((filter) => (
          <div key={filter.key}>
            <Select
              value={selectedFilters[filter.key] || ""}
              onValueChange={(selected) => applyFilters([selected], filter.key)}
            >
              <SelectTrigger>
                <SelectValue placeholder={filter.label || "Select option"} />
              </SelectTrigger>
              <SelectContent>
                {filter.filters.map((option: optionInfo) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ))}
        {filtersToApply.length > 0 && (
          <>
            <Button
              variant="default"
              onClick={() => {
                handleTableFilters();
                handleSubmitFilters();
              }}
            >
              Submit
            </Button>
            <Button
              variant="secondary"
              className="h-full"
              onClick={handleTableFiltersReset}
            >
              Reset
            </Button>
          </>
        )}

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="ml-auto bg-transparent">
              Columns <ChevronDown className="ml-2 h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            {table
              .getAllColumns()
              .filter((col) => col.getCanHide())
              .map((col) => (
                <DropdownMenuCheckboxItem
                  key={col.id}
                  className="capitalize"
                  checked={col.getIsVisible()}
                  onCheckedChange={(v) => col.toggleVisibility(!!v)}
                >
                  {col.id}
                </DropdownMenuCheckboxItem>
              ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead key={header.id}>
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isFetching ? (
              <>
                {Array.from({ length: 10 }).map((_, rowIndex) => (
                  <TableRow key={`skeleton-row-${rowIndex}`}>
                    {columns.map((_, colIndex) => (
                      <TableCell key={`skeleton-cell-${colIndex}`}>
                        <Skeleton className="h-4 w-full rounded" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </>
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.getIsSelected() && "selected"}
                  className={`border-b ${getRowClassName ? getRowClassName(row) : ""
                    }`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <TableCell key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  No results.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      <div className="flex items-center justify-end space-x-2 py-4">
        {/* <div className="flex-1 text-sm text-muted-foreground">
          {table.getFilteredSelectedRowModel().rows.length} of{" "}
          {table.getFilteredRowModel().rows.length} row(s) selected.
        </div> */}
        <div className="flex items-center space-x-6 lg:space-x-8">
          <div className="flex items-center space-x-2">
            <p className="text-sm font-medium">Rows per page</p>
            <Select
              value={pagination.pageSize.toString()}
              onValueChange={(value) => {
                setPagination((prev) => ({
                  ...prev,
                  pageSize: Number(value),
                  pageIndex: 0,
                }));
                if (setSize) setSize(Number(value));
              }}
            >
              <SelectTrigger className="h-8 w-[70px]">
                <SelectValue placeholder={`${pagination.pageSize}`} />
              </SelectTrigger>
              <SelectContent side="top">
                {perPageArray.map((pageSize) => (
                  <SelectItem key={pageSize} value={`${pageSize}`}>
                    {pageSize}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <span className="text-sm">
            {table.getRowModel().rows.length > 0
              ? calculatePaginationDetails()
              : "0-0 of 0"}{" "}
          </span>
          <div className="flex w-[100px] items-center justify-center text-sm font-medium">
            {`Page: ${currentPage != null ? currentPage + 1 : currentPage} ${totalPages ? ` of ${totalPages}` : ""
              }`}
          </div>
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setPageNum(-1);
                handleTableFilters();
              }}
              disabled={currentPage === 0}
              type="button"
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                if (!placeHolder) setPageNum(1);
                handleTableFilters();
              }}
              disabled={
                data.length < pagination.pageSize ||
                placeHolder ||
                (currentPage ?? 0) >= (totalPages ?? 1) - 1
              }
            >
              Next
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
